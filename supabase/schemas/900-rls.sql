-- ===========================================================================
-- Row Level Security: enable + policies. NO GRANTS IN THIS FILE.
--
-- Schema files load alphabetically and pg-delta diffs the FINAL state, so a
-- REVOKE here would be silently undone by a GRANT in 999-grants.sql. All ACLs
-- live in that one file. See its header.
--
-- !! NEVER ADD `force row level security` TO THIS TABLE !!
-- It looks like hardening ("make even the owner obey RLS") and it is not: RLS
-- exempting the table owner is precisely what lets current_account()
-- (100-functions.sql) read the table without re-entering the policy.
--
-- Every policy is scoped `to authenticated`. anon gets nothing, here or in
-- 999-grants.sql.
-- ===========================================================================


-- ===========================================================================
-- accounts
-- ===========================================================================
alter table public.accounts enable row level security;

-- Your own row, and only ever your own. With workspaces gone there are no
-- co-members, so there is no reason for one account to read another — this is
-- a flat, strictly self-scoped policy.
--
-- `(select auth.uid())` rather than a bare `auth.uid()`: wrapping it in a
-- scalar subquery makes the planner evaluate it once per statement as an
-- InitPlan instead of once per row scanned.
create policy accounts_select on public.accounts
  for select to authenticated
  using (id = (select auth.uid()));

-- No INSERT policy: handle_new_user() is the only creator of accounts, and it
-- is security definer so it bypasses RLS. RLS on + no policy = deny.

create policy accounts_update on public.accounts
  for update to authenticated
  using      (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- `id` is made immutable by the column-level UPDATE grant in 999-grants.sql,
-- not here — a WITH CHECK cannot see the OLD row and so cannot express "this
-- column did not change". `email` is withheld by that same grant: it mirrors
-- auth.users and is maintained by trigger, so a client that could write it
-- would be able to desync the mirror from the real address.

-- No DELETE policy: accounts die via the auth.users cascade.
