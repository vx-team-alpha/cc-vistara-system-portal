# Schema Reference

Current inventory of `supabase/schemas/`. Keep this in sync when objects are
added or removed — a stale inventory is worse than none, because it gets trusted.

## Tables

| Table             | Purpose                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| `public.accounts` | The only application table. 1:1 with `auth.users`; `id` **is** the auth user id. |

Columns: `id uuid pk → auth.users(id) on delete cascade`, `name text not null`,
`email text`, `picture_url text`, `created_at timestamptz`,
`updated_at timestamptz`.

There is **no** workspace, membership, invitation, or role table, and no enum
type. Authorization is entirely "is this your row?".

## Functions

| Function                            | Kind                              | Grant           |
| ----------------------------------- | --------------------------------- | --------------- |
| `public.current_account()`          | `setof accounts`, stable, definer | `authenticated` |
| `public.set_updated_at()`           | trigger                           | none            |
| `public.handle_new_user()`          | trigger                           | none            |
| `public.handle_user_email_change()` | trigger                           | none            |

All are `security definer` with `set search_path = ''`. Trigger functions are
deliberately ungranted — EXECUTE is checked at `create trigger` time, not when
they fire, so revoking keeps them off the PostgREST `/rpc/` surface.

## Triggers

| Trigger                      | Table             | Fires                                                                | Function                     |
| ---------------------------- | ----------------- | -------------------------------------------------------------------- | ---------------------------- |
| `on_auth_user_created`       | `auth.users`      | AFTER INSERT                                                         | `handle_new_user()`          |
| `on_auth_user_email_updated` | `auth.users`      | AFTER UPDATE OF `email`, `when old.email is distinct from new.email` | `handle_user_email_change()` |
| `set_updated_at`             | `public.accounts` | BEFORE UPDATE                                                        | `set_updated_at()`           |

Triggers on `auth.users` live in `210-auth-triggers.sql`; triggers on public
tables live in `200-triggers.sql` alongside the function bodies.

Signup ordering: `on_auth_user_created` fires inside GoTrue's signup
transaction and inserts the `accounts` row. If it raises, **signup fails** with
"Database error saving new user".

## Policies

| Policy            | Table      | Command | Predicate                                       |
| ----------------- | ---------- | ------- | ----------------------------------------------- |
| `accounts_select` | `accounts` | SELECT  | `id = (select auth.uid())`                      |
| `accounts_update` | `accounts` | UPDATE  | `id = (select auth.uid())` (using + with check) |

No INSERT policy (definer trigger is the only creator) and no DELETE policy
(cascade from `auth.users`). RLS enabled, **not** forced.

## Role model

- **`anon`** — nothing. Zero privileges on every object, enforced twice: policies
  are scoped `to authenticated`, and `999-grants.sql` revokes at the grant layer.
  The double lockdown is deliberate — a grant with no policy returns zero rows
  instead of an error, which is far harder to debug.
- **`authenticated`** — `select` on `accounts`, plus `update (name, picture_url)`.
  No insert, no delete. Reads are row-scoped by RLS.
- **`service_role`** — `grant all`. Has BYPASSRLS but still needs table grants.
  For service-only tables: enable RLS, write no policies.

## Column grants

```sql
grant select on public.accounts to authenticated;
grant update (name, picture_url) on public.accounts to authenticated;
```

Withheld from UPDATE, and why:

- `id` — re-pointing a row at another user.
- `email` — it mirrors `auth.users.email` via trigger. A writable mirror lets a
  user display an address they never proved they control. Changes must go
  through `supabase.auth.updateUser()`.
- `created_at` / `updated_at` — maintained by default and trigger.

## Commands

```bash
pnpm supabase:start      # start local stack
pnpm supabase:stop
pnpm supabase:reset      # rebuild DB from migrations
pnpm supabase:diff <name>  # generate migration from schema diff (--use-pg-delta)
pnpm supabase:typegen    # regenerate src/types/supabase.ts
pnpm typecheck           # tsc --noEmit
pnpm lint
```

There is no test runner and no pgTAP suite configured. To verify schema changes,
either `pnpm supabase:reset` against the local stack, or load the schema files
into a throwaway Postgres cluster with stubbed `auth` objects — see the
verification section in `examples.md`.

Commit the schema file, the generated migration, and regenerated types together.

## Port conflicts with sibling projects

The local stack uses ports `54321`–`54327`. Other Supabase projects on this
machine may be configured identically, and their containers are typically
created with `RestartPolicy: unless-stopped` — so `docker rm -f` is not enough,
they resurrect within seconds and reclaim the port. Stop the other project
properly from **its own directory**:

```bash
cd ../<other-project> && pnpm supabase stop
```

If `supabase start` reports "Starting database from backup..." and then fails,
its docker volume is corrupt. Removing it is safe when the DB is reproducible
from migrations and there is no `seed.sql`:

```bash
docker volume rm supabase_db_<project-name>
```

## Related skills

- **`supabase-db-changes`** — owns the migration workflow: diff generation,
  pg-delta vs migra, ordering pitfalls, and the pre-commit checklist. Read it
  before editing anything under `supabase/migrations/`.
- **`server-action-builder`** — how `authAction` consumes this schema. Note that
  `resolveAuthContext` takes **no arguments**: there is no scope to declare.
