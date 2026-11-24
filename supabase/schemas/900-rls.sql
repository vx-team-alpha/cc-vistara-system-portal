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


-- ===========================================================================
-- Catalogue tables
-- (configurator_types, product_ranges, design_styles, layouts, questions,
--  options, assets)
--
-- Platform-managed reference data. Authenticated users may SELECT; only
-- service_role writes (via admin scripts / scrape pipelines). service_role
-- has BYPASSRLS so no policies are needed for it.
--
-- All catalogue tables use `active = true` guards where applicable so that
-- soft-deleted rows are invisible to clients without a migration.
-- ===========================================================================

alter table public.configurator_types enable row level security;
alter table public.product_ranges     enable row level security;
alter table public.design_styles      enable row level security;
alter table public.layouts            enable row level security;
alter table public.questions          enable row level security;
alter table public.options            enable row level security;
alter table public.assets             enable row level security;

-- configurator_types: always show all rows (no active column)
create policy configurator_types_select on public.configurator_types
  for select to authenticated
  using (true);

-- product_ranges: only active ranges are visible
create policy product_ranges_select on public.product_ranges
  for select to authenticated
  using (active = true);

-- design_styles: always show all rows
create policy design_styles_select on public.design_styles
  for select to authenticated
  using (true);

-- layouts: only active layouts are visible
create policy layouts_select on public.layouts
  for select to authenticated
  using (active = true);

-- questions: only active questions are visible
create policy questions_select on public.questions
  for select to authenticated
  using (active = true);

-- options: always show all rows (visibility controlled by question.active)
create policy options_select on public.options
  for select to authenticated
  using (true);

-- assets: always show all rows
create policy assets_select on public.assets
  for select to authenticated
  using (true);


-- ===========================================================================
-- leads
--
-- Owned by the dealer account. A dealer can only see and manage their own
-- leads. No INSERT policy for anonymous homeowners — leads from the public
-- widget are created via the service_role client (API route), which bypasses
-- RLS. The INSERT policy here covers authenticated dealers creating test leads
-- or importing existing enquiries.
-- ===========================================================================

alter table public.leads enable row level security;

create policy leads_select on public.leads
  for select to authenticated
  using (account_id = (select auth.uid()));

create policy leads_insert on public.leads
  for insert to authenticated
  with check (account_id = (select auth.uid()));

-- Only `status` is actually writable after insert (enforced by column-level
-- UPDATE grant in 999-grants.sql). The policy allows the row to be addressed;
-- the grant restricts which columns can change.
create policy leads_update on public.leads
  for update to authenticated
  using      (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));

create policy leads_delete on public.leads
  for delete to authenticated
  using (account_id = (select auth.uid()));

alter table public.embed_widgets enable row level security;
create policy embed_widgets_select on public.embed_widgets for select to authenticated using (account_id = (select auth.uid()));
create policy embed_widgets_insert on public.embed_widgets for insert to authenticated with check (account_id = (select auth.uid()));
create policy embed_widgets_update on public.embed_widgets for update to authenticated using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));
-- Pause embeds instead of deleting them, preserving quote attribution.
alter table public.widget_views enable row level security;
create policy widget_views_select on public.widget_views for select to authenticated using (account_id = (select auth.uid()));

-- ===========================================================================
-- Internal orders
-- ===========================================================================

alter table public.business_profiles enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.order_documents enable row level security;
alter table public.order_deletion_audits enable row level security;

create policy business_profiles_select on public.business_profiles
  for select to authenticated using (account_id = (select auth.uid()));
create policy business_profiles_insert on public.business_profiles
  for insert to authenticated with check (account_id = (select auth.uid()));
create policy business_profiles_update on public.business_profiles
  for update to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));

create policy customers_select on public.customers
  for select to authenticated using (account_id = (select auth.uid()));
create policy customers_insert on public.customers
  for insert to authenticated with check (account_id = (select auth.uid()));
create policy customers_update on public.customers
  for update to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));
create policy customers_delete on public.customers
  for delete to authenticated using (account_id = (select auth.uid()));

create policy orders_select on public.orders
  for select to authenticated using (account_id = (select auth.uid()));
create policy orders_insert on public.orders
  for insert to authenticated with check (account_id = (select auth.uid()));
create policy orders_update on public.orders
  for update to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));
create policy orders_delete_admin on public.orders
  for delete to authenticated
  using (
    account_id = (select auth.uid())
    and status in ('draft', 'cancelled')
    and exists (
      select 1
      from public.accounts a
      where a.id = (select auth.uid()) and a.role = 'admin'
    )
  );

create policy order_items_select on public.order_items
  for select to authenticated using (account_id = (select auth.uid()));
create policy order_items_insert on public.order_items
  for insert to authenticated with check (
    account_id = (select auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.account_id = (select auth.uid())
        and o.status = 'draft'
    )
  );
create policy order_items_update on public.order_items
  for update to authenticated
  using (
    account_id = (select auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.account_id = (select auth.uid())
        and o.status = 'draft'
    )
  )
  with check (
    account_id = (select auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.account_id = (select auth.uid())
        and o.status = 'draft'
    )
  );
create policy order_items_delete on public.order_items
  for delete to authenticated using (
    account_id = (select auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.account_id = (select auth.uid())
        and o.status = 'draft'
    )
  );

create policy order_events_select on public.order_events
  for select to authenticated using (account_id = (select auth.uid()));
create policy order_events_insert on public.order_events
  for insert to authenticated with check (account_id = (select auth.uid()));

create policy order_documents_select on public.order_documents
  for select to authenticated using (account_id = (select auth.uid()));

create policy order_deletion_audits_select_admin on public.order_deletion_audits
  for select to authenticated using (
    account_id = (select auth.uid())
    and exists (
      select 1
      from public.accounts a
      where a.id = (select auth.uid()) and a.role = 'admin'
    )
  );
