-- Internal order workspace. Public embeds and legacy leads are retired separately
-- after the order workflow is verified against the replacement database.

create table public.business_profiles (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  business_name text not null default '',
  phone text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default '',
  zip_code text not null default '',
  logo_url text not null default '',
  pdf_footer text not null default '',
  order_prefix text not null default 'ORD'
    check (order_prefix ~ '^[A-Z0-9]{1,10}$'),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  phone text not null check (char_length(btrim(phone)) between 1 and 50),
  phone_normalized text not null check (char_length(phone_normalized) between 3 and 30),
  address text not null check (char_length(btrim(address)) between 1 and 240),
  city text not null check (char_length(btrim(city)) between 1 and 120),
  state text not null check (char_length(btrim(state)) between 1 and 120),
  zip_code text not null check (char_length(btrim(zip_code)) between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, account_id)
);

create index customers_account_name_idx on public.customers (account_id, lower(name));
create index customers_account_phone_idx on public.customers (account_id, phone_normalized);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  customer_id uuid not null,
  sequence_number bigint not null,
  order_number text not null,
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'confirmed', 'in_production', 'completed', 'cancelled')),
  customer_snapshot jsonb not null,
  delivery_date date,
  note text not null default '' check (char_length(note) <= 4000),
  revision integer not null default 1 check (revision > 0),
  issued_at timestamptz,
  confirmed_at timestamptz,
  production_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (customer_id, account_id)
    references public.customers(id, account_id) on delete restrict,
  unique (account_id, sequence_number),
  unique (account_id, order_number),
  unique (id, account_id)
);

create index orders_account_status_idx on public.orders (account_id, status, updated_at desc);
create index orders_account_delivery_idx on public.orders (account_id, delivery_date)
  where delivery_date is not null;
create index orders_customer_idx on public.orders (customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  line_number smallint not null check (line_number > 0),
  layout_id uuid references public.layouts(id) on delete restrict,
  system text not null default 'eurocell' check (system = 'eurocell'),
  width_mm integer not null check (width_mm between 300 and 2800),
  height_mm integer not null check (height_mm between 1750 and 2500),
  quantity integer not null default 1 check (quantity between 1 and 999),
  location text not null default '' check (char_length(location) <= 120),
  configuration jsonb not null default '{}',
  catalogue_snapshot jsonb not null default '{}',
  manufacturing_snapshot jsonb,
  outside_drawing text,
  inside_drawing text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (order_id, account_id)
    references public.orders(id, account_id) on delete cascade,
  unique (order_id, line_number)
);

create index order_items_order_idx on public.order_items (order_id, line_number);
create index order_items_account_idx on public.order_items (account_id, updated_at desc);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  event_type text not null,
  previous_status text,
  next_status text,
  revision integer not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  foreign key (order_id, account_id)
    references public.orders(id, account_id) on delete cascade
);

create index order_events_order_idx on public.order_events (order_id, created_at desc);

create table public.order_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  document_type text not null
    check (document_type in ('specification', 'confirmation', 'works_order')),
  revision integer not null check (revision > 0),
  storage_key text not null,
  checksum text not null,
  generation_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  foreign key (order_id, account_id)
    references public.orders(id, account_id) on delete cascade,
  unique (order_id, document_type, revision)
);

create index order_documents_order_idx on public.order_documents (order_id, created_at desc);
