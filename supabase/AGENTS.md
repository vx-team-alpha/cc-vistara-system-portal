# Supabase Database

## Schema Organization

Schemas in `schemas/` directory with numbered prefixes for dependency ordering.

## Skills

For database implementation:

- `/postgres-expert` - Schema design, RLS, migrations, testing

## Migration Workflow

**Schema files are the source of truth.** Always modify the schema files in `schemas/` first, then generate a migration from the diff. Never write migration SQL by hand.

> Diffs go through Supabase's `pg-delta` backend, enabled via `[experimental.pgdelta] enabled = true` in `config.toml`. The legacy `migra` backend silently strips `WITH (security_invoker = true)` and `GRANT` statements when regenerating views — pg-delta uses `CREATE OR REPLACE` and preserves both. If you ever need to fall back, append `--use-migra` to a single `pnpm supabase:web:diff` invocation and flag it in review. See ARCHITECTURE.md ADR-17 for full context.
>
> **Known pg-delta-alpha limitation:** grant inference does not honour `alter default privileges`. Workaround lives in `schemas/130-pg-delta-explicit-revokes.sql` (explicit per-function `revoke execute … from authenticated`). After any MakerKit upstream merge that adds new functions in `schemas/00-…` through `schemas/17-…`, run `pnpm supabase:web:diff` and confirm `No schema changes found`. If pg-delta emits new false `GRANT … TO authenticated`, append revokes to `130-pg-delta-explicit-revokes.sql` — the CI drift gate (`workflow.yml` pgtap-tests "verify schema files match migration state") blocks the PR otherwise. Drop the file when pg-delta GA fixes the bug.

### Migration timestamp conflicts (sibling PR merged first)

When a sibling PR is merged while yours is open, its migrations advance the timestamp watermark on `main`. Any branch migration with a timestamp ≤ that watermark will fail to deploy. Fix it before pushing:

```bash
pnpm migration:fix-timestamps
```

The script (`scripts/worktree/fix-migration-timestamps.sh`) compares branch-only migrations against `origin/main`, and if any timestamp is out of order, renames all branch migrations to sequential timestamps starting from now. Idempotent — safe to re-run. Use `--check` to detect without fixing (exits 1 if a fix is needed, useful in CI).

### New Entities

```bash
# 1. Create schema file
touch schemas/20-feature.sql

# 2. Create migration from diff
pnpm --filter web run supabase:db:diff -f feature_name

# 3. Apply and generate types
pnpm --filter web supabase migrations up
pnpm supabase:web:typegen
```

### Modify Existing

```bash
# 1. Edit the schema file(s) in schemas/
# 2. Generate migration from diff
pnpm --filter web run supabase:db:diff -f update_feature

# 3. Apply and generate types
pnpm --filter web supabase migrations up
pnpm supabase:typegen
```

## Security Rules

- **ALWAYS enable RLS** on new tables
- **NEVER use SECURITY DEFINER** without explicit access controls
- Use existing helper functions (see `/postgres-expert` skill)

## Table Template

This is a **single-tenant** schema: `public.accounts` is the only application
table, its `id` IS the `auth.users` id, and every owned row points at it. There
is no workspace/membership/role model — authorization is always "is this your
row?", which is why the policy below is a bare `auth.uid()` comparison and no
helper function is involved.

```sql
create table if not exists public.feature (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Postgres does not index the referencing side of a foreign key, and every
-- policy below filters on account_id.
create index feature_account_id_idx on public.feature (account_id);

alter table public.feature enable row level security;

-- `(select auth.uid())` — the scalar subquery makes the planner evaluate it
-- once per statement as an InitPlan instead of once per row scanned.
create policy feature_select on public.feature
  for select to authenticated
  using (account_id = (select auth.uid()));

create policy feature_insert on public.feature
  for insert to authenticated
  with check (account_id = (select auth.uid()));

create policy feature_update on public.feature
  for update to authenticated
  using      (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));

create policy feature_delete on public.feature
  for delete to authenticated
  using (account_id = (select auth.uid()));
```

Grants go in `999-grants.sql` — **never** in the table file or the RLS file. That
file is the last word on every ACL (schema files load alphabetically and pg-delta
diffs the final state), so a grant anywhere else is silently overridden:

```sql
revoke all on public.feature from public;
revoke all on public.feature from anon, authenticated, service_role;

-- account_id withheld from UPDATE: a column-level grant is what makes it
-- immutable. A WITH CHECK cannot see the OLD row, so it cannot express
-- "this column did not change".
grant select, insert, delete on public.feature to authenticated;
grant update (/* editable columns */) on public.feature to authenticated;
grant all on public.feature to service_role;
```

## Vault secrets for edge-function invocation

`util.invoke_edge_function()` (in `schemas/100-grantbite-extensions.sql`) — called by every cron- and trigger-driven edge invoke (pipeline drain/probe, `reconcile-credits`, embeddings) — reads two **Vault** secrets via `util.project_url()` / `util.service_role_key()`:

| Vault secret name | Value |
|---|---|
| `project_url` | `https://<project-ref>.supabase.co` |
| `service_role_key` | the project's **`sb_secret_…`** publishable-secret key |

`service_role_key` MUST be the `sb_secret_` key, **not** a legacy `service_role` JWT: the edge functions are wrapped in `withSupabase({ auth: 'secret' })` and validate the inbound `apikey` against `SUPABASE_SECRET_KEY`. A JWT passes PostgREST but **401s** every edge invoke (the PR #914 trap).

| Target | How it's seeded |
|---|---|
| Per-PR ephemeral branches | CI — `branch-env.yml` → `branch-mgr.sh seed-vault` (idempotent; reveals the branch's `sb_secret_` key from the Management API `/api-keys?reveal=true` via `reveal_branch_api_keys` — NOT `branches get -o env`'s `SUPABASE_DEFAULT_KEY`, which is not the branch's active key) |
| Production / persistent preview | **Manual** — Supabase never copies a parent's Vault to a branch, so these must be set/verified by hand (see below) |

### Manual prod / persistent-preview step

Branches do not inherit Vault, so production (`nmebdjghnfwpnvdlpjar`) and the persistent preview branch must be **verified** to hold both secrets (the preview branch was seeded manually 2026-06-12). To set or refresh — run against the project DB (never commit the values):

```sql
-- value first, name second; keyed by name (vault enforces name-uniqueness)
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<the project sb_secret_ key>', 'service_role_key');
-- if a secret already exists, update by id instead:
--   select vault.update_secret(id, '<new value>') from vault.secrets where name = '...';
```

Get the `sb_secret_` key from the Management API `/api-keys?reveal=true` (type `secret`) or the dashboard — NOT the `service_role` JWT.

## Commands

```bash
pnpm supabase:web:reset     # Reset database
pnpm supabase:web:typegen   # Generate TypeScript types
pnpm --filter web supabase migrations list  # View migrations
```
