-- ===========================================================================
-- 999-grants.sql
--
-- THE ONLY FILE IN THIS DIRECTORY THAT MAY CONTAIN GRANT OR REVOKE.
--
-- Schema files load alphabetically and pg-delta diffs the final state, so this
-- file is the last word on every ACL. Put a GRANT anywhere else and this file
-- will silently override it — or, worse, fail to.
--
-- Everything here is explicit because nothing is implicit: `auto_expose_new_tables`
-- is unset in config.toml (new tables get NO grants at all), and pg-delta does
-- not honour `alter default privileges`. A perfect RLS policy with no GRANT
-- produces "permission denied for table accounts" on every request.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- FUNCTIONS
--
-- CREATE FUNCTION implicitly grants EXECUTE to PUBLIC, and anon is a member of
-- PUBLIC. `revoke ... from anon` removes an anon-specific grant that does not
-- exist and leaves the PUBLIC grant intact — anon can still call the function.
-- The revoke must name PUBLIC.
-- ---------------------------------------------------------------------------
revoke all on all functions in schema public from public;
revoke all on all functions in schema public from anon, authenticated, service_role;

-- The bulk statement above is not enough on its own: pg-delta does not model
-- PUBLIC grants, so it never emits the revoke into the migration and every
-- function ships with Postgres's implicit `EXECUTE TO PUBLIC` intact. These
-- explicit per-function revokes are what actually reach the database.
-- ADD A LINE HERE FOR EVERY NEW FUNCTION. See supabase/AGENTS.md.
revoke all on function public.current_account() from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_user_email_change() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- current_account() is called directly by app code to read the caller's own row,
-- because the accounts SELECT grant below is column-restricted — see the note
-- on that grant.
grant execute on function public.current_account() to authenticated;

-- The trigger functions get NO grant:
--   handle_new_user, handle_user_email_change, set_updated_at
-- EXECUTE on a trigger function is checked at CREATE TRIGGER time, not when it
-- fires, so revoking is safe — and it keeps them off the PostgREST /rpc/ surface
-- (otherwise authenticated could POST /rest/v1/rpc/handle_new_user).


-- ---------------------------------------------------------------------------
-- TABLES
--
-- anon gets nothing. Not one privilege. The policies are also scoped
-- `to authenticated`, but denying at the grant layer too is deliberate: a table
-- grant with no matching policy returns zero rows instead of an error, which is
-- a far worse failure mode to debug than "permission denied".
--
-- The COLUMN-LEVEL update grant below is doing real security work. It is what
-- makes id / email / the timestamps immutable from the client. Do not try to
-- replace it with a WITH CHECK clause: a WITH CHECK cannot see the OLD row, so
-- it cannot express "this column did not change".
-- ---------------------------------------------------------------------------
revoke all on public.accounts from public;
revoke all on public.accounts from anon, authenticated, service_role;

-- `revoke all` above does not clear MAINTAIN/REFERENCES/TRIGGER/TRUNCATE —
-- Postgres grants these to the table owner's role set at CREATE TABLE time
-- outside the ALL-privileges bundle pg-delta targets, so they survive the
-- bulk revoke and must be named explicitly.
revoke maintain, references, trigger, truncate on public.accounts from anon, authenticated;

-- accounts -------------------------------------------------------------------
-- No INSERT and no DELETE: handle_new_user() is the only creator, and accounts
-- die via the auth.users cascade. Granting either would be misleading, since
-- there is no matching policy and the operation would silently affect 0 rows.
--
-- SELECT is unrestricted across columns because accounts_select (900-rls.sql)
-- already limits the caller to their OWN row — there is no other account's data
-- to withhold now that co-member visibility is gone.
--
-- UPDATE is restricted to the two user-editable display fields. `email` is
-- excluded on purpose: it is a mirror of auth.users.email maintained by the
-- on_auth_user_email_updated trigger, so letting a client write it would let
-- them point their profile at an address they have never proven they control.
-- Email changes must go through GoTrue (supabase.auth.updateUser), which
-- verifies ownership and then feeds the trigger.
grant select on public.accounts to authenticated;
-- `role` is intentionally excluded from the authenticated UPDATE grant.
-- Only service_role (admin portal) may change a user's role. The column-level
-- grant is what enforces immutability: a WITH CHECK cannot see the OLD row,
-- so it cannot express "this column did not change".
grant update (name, picture_url) on public.accounts to authenticated;

-- service_role ---------------------------------------------------------------
-- BYPASSRLS, but it still needs table grants.
grant all on public.accounts to service_role;


-- ===========================================================================
-- Catalogue tables
-- (configurator_types, product_ranges, design_styles, layouts, questions,
--  options, assets)
--
-- Authenticated users can SELECT only. No INSERT/UPDATE/DELETE — that is
-- exclusively for service_role (admin pipelines / scrape scripts).
-- ===========================================================================

-- configurator_types ----------------------------------------------------------
revoke all on public.configurator_types from public;
revoke all on public.configurator_types from anon, authenticated, service_role;
revoke maintain, references, trigger, truncate on public.configurator_types from anon, authenticated;
grant select on public.configurator_types to authenticated;
grant all    on public.configurator_types to service_role;

-- product_ranges --------------------------------------------------------------
revoke all on public.product_ranges from public;
revoke all on public.product_ranges from anon, authenticated, service_role;
revoke maintain, references, trigger, truncate on public.product_ranges from anon, authenticated;
grant select on public.product_ranges to authenticated;
grant all    on public.product_ranges to service_role;

-- design_styles ---------------------------------------------------------------
revoke all on public.design_styles from public;
revoke all on public.design_styles from anon, authenticated, service_role;
revoke maintain, references, trigger, truncate on public.design_styles from anon, authenticated;
grant select on public.design_styles to authenticated;
grant all    on public.design_styles to service_role;

-- layouts ---------------------------------------------------------------------
revoke all on public.layouts from public;
revoke all on public.layouts from anon, authenticated, service_role;
revoke maintain, references, trigger, truncate on public.layouts from anon, authenticated;
grant select on public.layouts to authenticated;
grant all    on public.layouts to service_role;

-- questions -------------------------------------------------------------------
revoke all on public.questions from public;
revoke all on public.questions from anon, authenticated, service_role;
revoke maintain, references, trigger, truncate on public.questions from anon, authenticated;
grant select on public.questions to authenticated;
grant all    on public.questions to service_role;

-- options ---------------------------------------------------------------------
revoke all on public.options from public;
revoke all on public.options from anon, authenticated, service_role;
revoke maintain, references, trigger, truncate on public.options from anon, authenticated;
grant select on public.options to authenticated;
grant all    on public.options to service_role;

-- assets ----------------------------------------------------------------------
revoke all on public.assets from public;
revoke all on public.assets from anon, authenticated, service_role;
revoke maintain, references, trigger, truncate on public.assets from anon, authenticated;
grant select on public.assets to authenticated;
grant all    on public.assets to service_role;


-- ===========================================================================
-- leads
--
-- Authenticated dealers can read, insert, and delete their own rows.
-- UPDATE is column-restricted: only `status` may be changed after insert.
-- `spec` is intentionally excluded from the UPDATE grant — it is an
-- immutable snapshot of choices at submission time.
-- `name`, `email`, `phone`, `source_url` are also excluded: if contact info
-- needs correcting, close the lead and create a new one.
-- ===========================================================================
revoke all on public.leads from public;
revoke all on public.leads from anon, authenticated, service_role;
revoke maintain, references, trigger, truncate on public.leads from anon, authenticated;

grant select, insert, delete on public.leads to authenticated;
grant update (status)         on public.leads to authenticated;
grant all                     on public.leads to service_role;
-- Catalogue identities are allocated only by the trusted import service.
revoke all on sequence public.configurator_types_id_seq from public, anon, authenticated, service_role;
grant usage, select on sequence public.configurator_types_id_seq to service_role;


revoke all on public.embed_widgets from public, anon, authenticated, service_role;
grant select, insert on public.embed_widgets to authenticated;
grant update (name, website_url, enabled) on public.embed_widgets to authenticated;
grant all on public.embed_widgets to service_role;
revoke all on public.widget_views from public, anon, authenticated, service_role;
grant select on public.widget_views to authenticated;
grant all on public.widget_views to service_role;
