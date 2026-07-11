-- ===========================================================================
-- Helper functions.
--
-- WHY `security definer` HERE:
--   The SELECT grant on accounts (999-grants.sql) is column-restricted, and
--   column privileges apply to columns referenced in a WHERE clause too — not
--   just the select-list. `security definer` runs the body as the function
--   owner (postgres, who owns the table), so the body is exempt from both the
--   column grant and RLS.
--
-- WHY `set search_path = ''`:
--   A security-definer function with a mutable search_path is a privilege-
--   escalation vector. Everything below is schema-qualified as a result.
--
-- This file must sort AFTER the table files: check_function_bodies is on, so a
-- `language sql` body is parsed at CREATE time and its tables must exist.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- The caller's own account row, in full.
--
-- Set-returning (0 or 1 rows) rather than a strict scalar return so a caller
-- with no account row gets an empty set instead of an error inside the
-- function — callers use `.maybeSingle()` and handle "no row" themselves.
--
-- Note there is no `current_account_id()` any more: the account id IS
-- auth.uid() now that accounts.id references auth.users directly, so any code
-- that needs just the id should use auth.uid() and skip the round trip.
-- ---------------------------------------------------------------------------
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
