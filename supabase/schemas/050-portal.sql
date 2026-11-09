-- Account-owned door and window components. The random public key is safe in HTML.
create table public.embed_widgets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  configurator_type_id smallint not null references public.configurator_types(id),
  public_key uuid not null unique default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  website_url text not null default '' check (char_length(website_url) <= 500),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, account_id)
);
create index embed_widgets_account_idx on public.embed_widgets(account_id, created_at desc);
create index embed_widgets_type_idx on public.embed_widgets(configurator_type_id);

create table public.widget_views (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  session_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (widget_id, account_id) references public.embed_widgets(id, account_id) on delete cascade,
  unique (widget_id, session_id)
);
create index widget_views_account_idx on public.widget_views(account_id, created_at desc);

alter table public.leads add column widget_id uuid;
alter table public.leads add column session_id uuid;
alter table public.leads add constraint leads_widget_owner_fkey
  foreign key (widget_id, account_id) references public.embed_widgets(id, account_id);
create index leads_widget_idx on public.leads(widget_id) where widget_id is not null;
create unique index leads_widget_session_idx on public.leads(widget_id, session_id)
  where widget_id is not null and session_id is not null;
