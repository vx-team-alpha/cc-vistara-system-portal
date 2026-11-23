---
name: supabase-db-changes
description: Use when changing the Supabase database in this repo — adding/altering tables, columns, indexes, constraints, triggers, RLS policies, grants, views, or functions; generating, editing, or applying migrations; regenerating Supabase types. Triggers when the user says "add column", "new table", "change schema", "create migration", "modify RLS", "regenerate types", "supabase:diff/reset/typegen", or edits any file under `supabase/schemas/` or `supabase/migrations/`.
---

# Supabase DB Changes

The database uses **Supabase declarative schemas**. The files in `supabase/schemas/` are the source of truth; migrations are _generated_ from diffs against them. Never invert that.

This skill owns the **migration workflow**. For schema _design_ — RLS predicates, grant patterns, security-definer conventions, the shape of this project's schema — use `postgres-expert`.

## Mandatory workflow

1. **Edit the schema file** in `supabase/schemas/` that owns the object you're changing. Pick the file by numbering convention (below).
2. `pnpm supabase:diff <descriptive_name>` — generates a migration into `supabase/migrations/`. Uses `--use-pg-delta` (configured in `package.json`); do not switch to migra. Snake_case names (`add_account_email_index`, not `AddAccountEmailIndex`).
3. **Review the generated migration.** It should match what you intended. With `pg-delta` you almost never need hand-edits; if you do, see "When pg-delta falls short" below.
4. `pnpm supabase:reset` — applies all migrations to the local DB from scratch. Catches order/dependency bugs that a push against a populated DB hides.
5. **Cross-engine diff verification** — run all three diff engines; _all three_ must report **"No schema changes found"**:
   ```bash
   pnpm supabase db diff --use-pg-delta
   pnpm supabase db diff --use-migra
   pnpm supabase db diff --use-pg-schema
   ```
   No single engine catches everything. Each has different blindspots, so running all three is the strongest "migration is complete" signal we have. If any of them reports a diff, fix the schema files (not the migration) until all three are clean. Skip `--use-pgadmin` — it's broken in current CLI versions (container exits 1).
6. `pnpm supabase:typegen` — regenerates `src/types/supabase.ts`.
7. **Stop here for Claude.** The remote push is performed by a human operator, not by the assistant. Every `supabase db push` variant is blocked at the permission layer — see the `deny` list in `.claude/settings.json`. Hand the migration off; do not attempt to push.
8. **Commit together**: schema files + migration + regenerated types in one commit.

## Why `--use-pg-delta` (not migra)

The Supabase CLI defaults to `migra`, which silently misses:

- View options like `WITH (security_invoker = 'true')` on existing views
- `ALTER DEFAULT PRIVILEGES … REVOKE … FROM anon`
- Column-level grants (`GRANT UPDATE (col1, col2) ON … TO …`)
- View-level revokes (`REVOKE ALL ON public.<view> FROM anon`)
- Per-function grant changes

A migra-generated migration can pass `db diff` clean while leaving real privilege drift in the DB. This matters acutely here: `999-grants.sql` depends on **column-level grants** (`grant update (name, picture_url)`) to make `id` and `email` immutable. Regenerating with migra drops that clause, silently making `email` client-writable.

`pg-delta` emits all of the above. The `package.json` script is pinned to `--use-pg-delta` and should stay pinned.

## Schema file numbering (`supabase/schemas/`)

Files are loaded **alphabetically**. This ordering is load-bearing: `check_function_bodies` is on, so a `language sql` function body is parsed at CREATE time and every table it references must already exist.

Current files:

| File                    | Contents                                                  |
| ----------------------- | --------------------------------------------------------- |
| `010-accounts.sql`      | The `accounts` table (the only application table).        |
| `100-functions.sql`     | `current_account()`. Must sort **after** the table files. |
| `200-triggers.sql`      | Trigger functions + triggers on **public** tables.        |
| `210-auth-triggers.sql` | Triggers on **`auth.users`** only.                        |
| `900-rls.sql`           | `enable row level security` + policies. **No grants.**    |
| `999-grants.sql`        | Every `grant`/`revoke`. Nothing else.                     |

Convention for new files: `0xx` foundation (extensions, enums), `1xx`–`8xx` tables and their functions, `9xx` RLS and grants. Put a new table at `020-`, `030-`, … and its functions after `100-`.

## Hard rules

- **Never** make schema changes in the Supabase dashboard. Always edit a schema file and generate a migration.
- **Never** hand-write a migration from scratch. Generate via `pnpm supabase:diff` first; only then add hand-edits the diff couldn't capture.
- **Never** edit `src/types/supabase.ts` by hand. Regenerate with `pnpm supabase:typegen`.
- **Never** edit a migration that has already been pushed to remote. Generate a new migration to fix forward.
- **Never** commit schema files without their generated migration and updated types. Reviewers can't verify drift otherwise.
- **Never** put a `grant` or `revoke` outside `999-grants.sql`. Alphabetical load order plus final-state diffing means it will be silently overridden.

## Ordering pitfalls

Alphabetical load order means `900-rls.sql` runs **before** `999-grants.sql`. So a `REVOKE` in 900 can be silently undone by a `GRANT` in 999. That is exactly why this repo keeps **all** ACLs in `999-grants.sql` and none in the RLS file.

- Put deny-by-default revokes that need to be **final** at the **end of `999-grants.sql`**.
- `ALTER DEFAULT PRIVILEGES … GRANT ALL ON {TABLES,FUNCTIONS,SEQUENCES} TO anon` is a silent footgun: it makes every _future_ object anon-readable. If you're hardening, audit `999-grants.sql` for these. Note that `auto_expose_new_tables` is unset in `config.toml`, so new tables get **no** grants by default — the reverse footgun applies too: a new table with perfect RLS and no grant returns "permission denied" on every request.
- Verify default ACLs with:
  ```bash
  docker exec supabase_db_cc-frontage-desgn psql -U postgres -d postgres -c \
    "SELECT defaclrole::regrole, defaclobjtype, defaclacl FROM pg_default_acl WHERE defaclnamespace = 'public'::regnamespace;"
  ```
  `anon` should not appear in any `postgres`-owned default ACL.

## Views and `security_invoker`

There are no views in this schema today. If you add one: views default to running with the **owner's** privileges, which bypasses RLS on the underlying tables. Always set:

```sql
CREATE OR REPLACE VIEW "public"."my_view"
  WITH ("security_invoker" = 'true') AS
  SELECT ...;
```

Then audit every caller before merging:

```bash
grep -rn "<view_name>" src/
```

Any caller that needs cross-user data (admin pages, system jobs) must use the service-role client from `@/lib/supabase/admin`. User-scoped callers keep working unchanged.

## RLS policy conventions

Full detail lives in `postgres-expert`. The essentials for migration review:

- Use `(SELECT auth.uid())`, not bare `auth.uid()`. The subquery form is evaluated **once per query** as an InitPlan; the bare form is evaluated **once per row**.
- Naming here is `<table>_<action>` — `accounts_select`, `accounts_update`.
- `service_role` has `BYPASSRLS`. For service-role-only tables, just `ENABLE ROW LEVEL SECURITY` and add no client policies — the empty policy set is the deny.
- Revoke-then-grant when changing table grants, so stale permissions aren't inherited:
  ```sql
  REVOKE ALL ON public.<table> FROM public;
  REVOKE ALL ON public.<table> FROM anon, authenticated, service_role;
  GRANT SELECT ON public.<table> TO authenticated;
  GRANT ALL ON public.<table> TO service_role;
  ```
- **Never** add `force row level security` — it breaks the security-definer helpers by subjecting the table owner to RLS, and every policy recurses.

## When `pg-delta` falls short

Rare. Known gaps:

- **New functions silently get `PUBLIC EXECUTE` (anon can call them).** When a migration creates a new function, pg-delta does NOT emit per-function `REVOKE EXECUTE … FROM PUBLIC`. The bulk `REVOKE … ON ALL FUNCTIONS` in `999-grants.sql` only affects functions that exist _at the moment it runs_ — it is not a default-privilege rule. Result: pg-delta reports "No schema changes found" while anon can call the new function.

  Note `REVOKE … FROM anon` alone does **not** fix this: `create function` grants EXECUTE to **PUBLIC**, and `anon` inherits it as a member of PUBLIC. The revoke must name PUBLIC.

  This is why `999-grants.sql` carries an explicit per-function revoke line for every function. **Add one there whenever you add a function**, then verify after `pnpm supabase:reset`:

  ```bash
  docker exec supabase_db_cc-frontage-desgn psql -U postgres -d postgres -c \
    "SELECT p.proname, r.rolname, has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_exec
       FROM pg_proc p, pg_roles r
      WHERE p.pronamespace = 'public'::regnamespace
        AND r.rolname IN ('anon','authenticated','service_role')
      ORDER BY p.proname, r.rolname;"
  ```

  `anon` MUST show `can_exec = f` for every function.

- `ALTER PUBLICATION supabase_realtime ADD TABLE …` — pg-delta does not emit publication membership changes. If you add a table that needs realtime, hand-add an idempotent block to the migration:

  ```sql
  do $$
  begin
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename='<table>'
    ) then
      alter publication supabase_realtime add table only public."<table>";
    end if;
  end $$;
  ```

- Bulk `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA … FROM …`. pg-delta emits per-object revokes instead, which has the same effect; only hand-add the bulk form if you specifically want it for documentation/audit.

- **Phantom `CREATE OR REPLACE FUNCTION` re-emits.** All three diff engines sometimes re-emit a `CREATE OR REPLACE FUNCTION` for a function whose body in the live DB is byte-for-byte identical to the schema file. Comparing `pg_get_functiondef(oid)` against the schema source shows identical text — the engines read normalization metadata that doesn't round-trip cleanly.

  Mitigation: if all three engines emit _only_ identical-body `CREATE OR REPLACE FUNCTION` statements (no semantic change, no signature/owner/grant change), it is safe to ignore — the migration applies a no-op replace. Document it in the migration's hand-edit banner. Don't try to "fix" it by editing whitespace; the diff comes back regardless.

If you do hand-edit, add a banner header listing what you added so the next person regenerating knows what to preserve:

```sql
-- =============================================================================
-- <name> migration
--
-- HAND-EDITED: pg-delta does not emit <list>. Re-running `pnpm supabase:diff`
-- against this state should produce an empty diff.
-- =============================================================================
```

Then verify the round-trip: `pnpm supabase:reset && pnpm supabase db diff --use-pg-delta` must show "No schema changes found".

## Local verification commands

```bash
pnpm supabase:start                       # bring up local stack (idempotent)
pnpm supabase:reset                       # nuke local DB and re-apply all migrations
pnpm supabase db diff --use-pg-delta      # primary diff (matches pnpm supabase:diff)
pnpm supabase db diff --use-migra         # cross-check #1
pnpm supabase db diff --use-pg-schema     # cross-check #2
pnpm supabase:typegen                     # regenerate src/types/supabase.ts
pnpm supabase:stop                        # tear down (data preserved in docker volume)
```

All three diff commands must report "No schema changes found" before merging.

For ad-hoc psql against the local DB:

```bash
docker exec -it supabase_db_cc-frontage-desgn psql -U postgres -d postgres
```

### When the local stack won't start

The stack uses ports `54321`–`54327`. Sibling Supabase projects on this machine may be configured identically, and their containers are typically created with `RestartPolicy: unless-stopped` — so `docker rm -f` is not enough, they resurrect within seconds and reclaim the port. Stop the other project properly, from **its own directory**:

```bash
cd ../<other-project> && pnpm supabase stop
```

If `supabase start` prints "Starting database from backup..." and then fails, that project's docker volume is corrupt. Removing it is safe when the DB is reproducible from migrations and there is no `supabase/seed.sql` (there isn't one here):

```bash
docker volume rm supabase_db_cc-frontage-desgn
```

If the stack is genuinely unavailable, schema files can still be verified by loading them into a throwaway Postgres cluster with stubbed `auth` objects — see the verification section in `postgres-expert`'s `examples.md`. That proves parse-correctness and RLS behaviour, but it does **not** substitute for the cross-engine diff check, which needs the real stack.

## Pre-commit checklist

- [ ] Schema file edited (not the migration directly, not the dashboard)
- [ ] Migration generated via `pnpm supabase:diff`
- [ ] Migration reviewed; hand-edits added if pg-delta couldn't express the change
- [ ] New functions have an explicit `revoke … from public` line in `999-grants.sql`
- [ ] `pnpm supabase:reset` applies cleanly
- [ ] All three diff engines report "No schema changes found": `--use-pg-delta`, `--use-migra`, `--use-pg-schema`
- [ ] `pnpm supabase:typegen` run; `src/types/supabase.ts` updated
- [ ] If RLS / view / grant changes: callers of any newly-restricted table audited
- [ ] Schema + migration + types staged in the same commit
