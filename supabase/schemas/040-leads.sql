-- ===========================================================================
-- leads — homeowner enquiries submitted through the configurator
--
-- account_id → the dealer/admin account that owns this enquiry.
-- layout_id  → the product geometry chosen; SET NULL on layout delete so
--              historical leads are not orphaned.
--
-- spec JSONB shape (snapshot at submission time — NEVER mutated after insert):
--   {
--     picks:       { "questionKey": "optionId", … },
--     texts:       { "questionKey": "freeTextValue", … },
--     particulars: [["label", "value"], …]
--   }
--
-- Only `status` is client-writable after creation. The column-level UPDATE
-- grant in 999-grants.sql enforces this at the DB layer.
-- ===========================================================================

create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts(id) on delete cascade,
  layout_id   uuid references public.layouts(id) on delete set null,
  name        text,
  email       text,
  phone       text,
  spec        jsonb not null default '{}',
  source_url  text,                            -- page where the configurator was embedded
  status      text not null default 'new',     -- 'new' | 'viewed' | 'contacted' | 'closed'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.leads is
  'Homeowner enquiry submitted through a configurator widget. spec is an immutable snapshot of choices at submission time.';

-- Primary access pattern: load all leads for an account, newest first.
create index leads_account_id_idx on public.leads (account_id, created_at desc);

-- Secondary: join leads to their layout for filtering/display.
create index leads_layout_id_idx  on public.leads (layout_id)
  where layout_id is not null;
