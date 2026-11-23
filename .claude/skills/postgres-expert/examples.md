# Database Examples

Real excerpts from `supabase/schemas/`. Paths are given so you can read the full
file — these are trimmed to the load-bearing parts.

## The table

`010-accounts.sql`. The whole application schema.

```sql
create table public.accounts (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text,
  picture_url text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

The PK **is** the auth user id rather than a surrogate key with a separate FK.
That is what collapses every policy to `id = (select auth.uid())` — no lookup
table, no helper function, and no way for the two ids to drift apart.

`email` is a **mirror** of `auth.users.email`, kept current by trigger. It exists
so the app can render an email without a second query; `auth.users` remains the
source of truth. For anything security-sensitive read the JWT
(`auth.jwt() ->> 'email'`) — this column is eventually-consistent by one
transaction. It is nullable because `auth.users.email` is (phone-only signup).

## RLS: self-scoped, and that is all

`900-rls.sql`. With no co-members there is no reason for one account to read
another, so both policies are flat equality against the caller.

```sql
alter table public.accounts enable row level security;

create policy accounts_select on public.accounts
  for select to authenticated
  using (id = (select auth.uid()));

create policy accounts_update on public.accounts
  for update to authenticated
  using      (id = (select auth.uid()))
  with check (id = (select auth.uid()));
```

There is **no INSERT policy** — `handle_new_user()` is the only creator and it is
security definer, so it bypasses RLS. RLS on + no policy = deny. Likewise **no
DELETE policy**: accounts die via the `auth.users` cascade.

`(select auth.uid())`, not bare `auth.uid()`: the subquery is uncorrelated, so
the planner hoists it to an InitPlan evaluated once per statement.

## Grants

`999-grants.sql`. Revoke everything, then re-grant narrowly.

```sql
revoke all on public.accounts from public;
revoke all on public.accounts from anon, authenticated, service_role;

grant select on public.accounts to authenticated;
grant update (name, picture_url) on public.accounts to authenticated;

-- service_role has BYPASSRLS, but it still needs table grants.
grant all on public.accounts to service_role;
```

SELECT is unrestricted across columns _because_ `accounts_select` already limits
the caller to their own row — there is no other account's data to withhold. The
UPDATE grant is where the real security work happens; see SKILL.md.

No INSERT and no DELETE grant: granting either would be misleading, since there
is no matching policy and the operation would silently affect 0 rows.

## Function revokes — the PUBLIC trap

`999-grants.sql`. `create function` implicitly grants EXECUTE **to PUBLIC**, and
`anon` is a member of PUBLIC. So `revoke ... from anon` removes an anon-specific
grant that does not exist, leaves the PUBLIC grant intact, and anon can still
call the function. **The revoke must name PUBLIC.**

```sql
revoke all on all functions in schema public from public;
revoke all on all functions in schema public from anon, authenticated, service_role;

-- The bulk statement is not enough on its own: pg-delta does not model PUBLIC
-- grants, so it never emits the revoke into the migration and every function
-- ships with Postgres's implicit EXECUTE TO PUBLIC intact. These explicit
-- per-function revokes are what actually reach the database.
-- ADD A LINE HERE FOR EVERY NEW FUNCTION.
revoke all on function public.current_account() from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_user_email_change() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- Re-grant only what is actually callable.
grant execute on function public.current_account() to authenticated;
```

## Security-definer function

`100-functions.sql`. Set-returning (0 or 1 rows) rather than a strict scalar
return, so a caller with no account row gets an empty set instead of an error
inside the function — callers use `.maybeSingle()` and handle "no row".

```sql
create or replace function public.current_account()
returns setof public.accounts
language sql
stable
security definer
set search_path = ''
as $$
  select a.*
  from public.accounts a
  where a.id = (select auth.uid());
$$;
```

Definer here because the SELECT grant may be column-restricted in future, and
column privileges apply to `where`-clause columns too. The body runs as the table
owner, so it is exempt from both the column grant and RLS.

Note there is **no `current_account_id()`** — the account id _is_ `auth.uid()`,
so code needing just the id should call that and skip the round trip.

## Trigger functions that cannot throw

`200-triggers.sql`. Both run inside GoTrue's transaction.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (id, name, email, picture_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'User'
    ),
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'picture', ''),
      nullif(new.raw_user_meta_data ->> 'avatar_url', '')
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
```

The `picture` / `avatar_url` coalesce is not redundant: Google and the other OIDC
providers put the image at `picture`, while Supabase's GitHub mapping uses
`avatar_url`. Checking only one silently drops the avatar for half the providers.

The name chain falls back through metadata → email local-part → a literal, so a
user created with no metadata at all (dashboard, Admin API, SSO) still works.

```sql
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.accounts
  set email = new.email
  where id = new.id;

  return new;
end;
$$;
```

Without this the mirrored column is written once at signup and then silently rots
on the first email change. A missing accounts row simply updates zero rows —
which is why this cannot throw.

## Triggers on `auth.users`

`210-auth-triggers.sql`. These live in their own file because pg-delta **does**
diff triggers on `auth.users` — put one only in a hand-written migration and the
next diff drops it.

```sql
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();
```

`update of email` narrows to statements touching the column; the `when` clause
then skips the no-op writes GoTrue makes on every sign-in (`last_sign_in_at` and
friends touch the row without changing the address).

Only _triggers_ belong in this file. Never add tables, columns, or constraints in
the `auth` schema — that is GoTrue's, and a diff against a linked project would
try to reconcile GoTrue's own migration state.

## Adding an owned table

The shape every new table should follow. Table + index in its own numbered file,
policies in `900-rls.sql`, grants in `999-grants.sql`.

```sql
-- 020-feature.sql
create table public.feature (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Postgres does not index the referencing side of a foreign key, and every
-- policy below filters on account_id.
create index feature_account_id_idx on public.feature (account_id);
```

```sql
-- 200-triggers.sql
create trigger set_updated_at
  before update on public.feature
  for each row execute function public.set_updated_at();
```

```sql
-- 900-rls.sql
alter table public.feature enable row level security;

create policy feature_select on public.feature
  for select to authenticated using (account_id = (select auth.uid()));

create policy feature_insert on public.feature
  for insert to authenticated with check (account_id = (select auth.uid()));

create policy feature_update on public.feature
  for update to authenticated
  using      (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));

create policy feature_delete on public.feature
  for delete to authenticated using (account_id = (select auth.uid()));
```

```sql
-- 999-grants.sql
revoke all on public.feature from public;
revoke all on public.feature from anon, authenticated, service_role;

grant select, insert, delete on public.feature to authenticated;
grant update (/* editable columns only — never account_id */) on public.feature to authenticated;
grant all on public.feature to service_role;
```

`account_id` is withheld from the UPDATE grant so a row cannot be re-parented
onto another account.

### Service-role-only table

For webhook/cron/ETL tables: enable RLS and write **no** policies. Default-deny
covers `authenticated`; `service_role` bypasses RLS.

```sql
alter table public.webhook_events enable row level security;
-- and stop.

revoke all on public.webhook_events from public;
revoke all on public.webhook_events from anon, authenticated, service_role;
grant all on public.webhook_events to service_role;
```

## Verifying schema files without the Supabase stack

When `supabase start` is unavailable, load the files into a throwaway cluster.
Stub only what the schema references from Supabase.

```sql
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb
);
create role anon;
create role authenticated;
create role service_role;
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
```

Then load every file in alphabetical order with `ON_ERROR_STOP=1`:

```bash
for f in $(ls supabase/schemas/*.sql | sort); do
  psql -d appdb -v ON_ERROR_STOP=1 -q -f "$f" || echo "FAILED: $f"
done
```

To prove RLS actually isolates, impersonate a user by redefining `auth.uid()`,
then **switch role** — this is the step that is easy to omit and that silently
invalidates the whole test:

```sql
create or replace function auth.uid() returns uuid language sql stable
  as $$ select '1111...'::uuid $$;

set role authenticated;          -- REQUIRED: postgres has BYPASSRLS

select id from public.accounts;  -- must return exactly the one row

update public.accounts set name = 'HACKED'
 where id = '2222...';           -- must report UPDATE 0

do $$ begin
  update public.accounts set email = 'attacker@evil.com' where id = '1111...';
  raise notice 'UNEXPECTED: email write succeeded';
exception when insufficient_privilege then
  raise notice 'OK: email column write denied';
end $$;

reset role;
```

Assertions worth keeping in any such run: both OAuth avatar conventions map to
`picture_url`; a no-metadata signup still gets a name; a phone-only signup (null
email) succeeds; an email change propagates; deleting the `auth.users` row
cascades the account away; and `anon` holds zero privileges.
