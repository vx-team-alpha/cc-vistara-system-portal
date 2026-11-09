-- ===========================================================================
-- Configurator catalogue — platform-managed, read-only for clients.
--
-- These tables hold the canonical product data scraped from third-party
-- portals. Authenticated users (dealer admins) can SELECT; only service_role
-- inserts / updates / deletes (via admin scripts or future pipelines).
--
-- Table hierarchy:
--
--   configurator_types   (door | window | future types)
--   └── product_ranges   (ORiGINAL / GRiPCORE / Advance70 Sculptured / …)
--       ├── design_styles  (Traditional / Contemporary / Designer / Stable)
--       ├── layouts        (84 door layouts; 91 window styles per range)
--       └── questions      (configuration steps for a range)
--           └── options    (selectable answers, with render metadata)
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- configurator_types: top-level category that drives the configurator UI
-- ---------------------------------------------------------------------------
create table public.configurator_types (
  id    smallint primary key generated always as identity,
  slug  text unique not null,   -- 'door' | 'window'
  label text not null
);

comment on table public.configurator_types is
  'Top-level product category. Determines which configurator UI is used.';


-- ---------------------------------------------------------------------------
-- product_ranges: a named product family within a configurator type
-- e.g. ORiGINAL, GRiPCORE, GRiPCORE Stable (doors)
--      Advance70 Chamfered Casement, Advance70 Sculptured Casement (windows)
-- ---------------------------------------------------------------------------
create table public.product_ranges (
  id                   uuid     primary key default gen_random_uuid(),
  configurator_type_id smallint not null references public.configurator_types(id),
  slug                 text     unique not null,  -- e.g. 'original', 'advance70-sculptured'
  name                 text     not null,
  source_url           text,                      -- scrape origin for audit trail
  active               boolean  not null default true,
  created_at           timestamptz not null default now()
);

comment on table public.product_ranges is
  'Named product family within a configurator type. One row per scraped range.';

create index product_ranges_type_idx on public.product_ranges (configurator_type_id);


-- ---------------------------------------------------------------------------
-- design_styles: optional sub-grouping within a range
-- Doors only: Traditional / Contemporary / Designer / Stable
-- Windows do not use this table (they group by style slug directly)
-- ---------------------------------------------------------------------------
create table public.design_styles (
  id         uuid     primary key default gen_random_uuid(),
  range_id   uuid     not null references public.product_ranges(id) on delete cascade,
  name       text     not null,    -- 'Traditional' | 'Contemporary' | 'Designer' | 'Stable'
  sort_order smallint not null default 0,
  unique(range_id, name)
);

comment on table public.design_styles is
  'Style sub-grouping within a range. Used for door design categories (Traditional / Contemporary / Designer / Stable).';

create index design_styles_range_idx on public.design_styles (range_id);


-- ---------------------------------------------------------------------------
-- layouts: a specific product geometry
--
-- Doors:   84 layouts × range (left-hand, door + sideslab, door + toplight, …)
-- Windows: 91 styles × range (case-1 through case-91)
--
-- style_id links to design_styles for door designs only.
-- external_id carries the portal's designId / style slug for scrape sync.
--
-- features JSONB shape:
--   Doors:   { hand, toplight, sidelightLeft, sidelightRight, sideslabLeft, sideslabRight }
--   Windows: { quantityOfSquares, quantityOfFacets }
--   Both:    { dimensions: [{ description, value }] }
-- ---------------------------------------------------------------------------
create table public.layouts (
  id          uuid    primary key default gen_random_uuid(),
  range_id    uuid    not null references public.product_ranges(id) on delete cascade,
  style_id    uuid    references public.design_styles(id) on delete set null,
  external_id text,                -- portal designId (UUID) or style slug
  slug        text    not null,
  name        text    not null,
  features    jsonb   not null default '{}',
  view_box    text,                -- SVG viewBox for layout picker display
  squares     smallint,            -- pane count (rough complexity indicator)
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique(range_id, slug)
);

comment on table public.layouts is
  'A specific product geometry. Doors: left-hand, sideslab combos (84 per range set). Windows: styles 1–91.';

create index layouts_range_idx on public.layouts (range_id);
create index layouts_style_idx on public.layouts (style_id)
  where style_id is not null;


-- ---------------------------------------------------------------------------
-- questions: a single configuration step within a range
--
-- section_scope controls which part of the product the question applies to:
--   'door'   — main door leaf (Door Colour, Glass Design, Handle, …)
--   'side'   — sidelight / sideslab sections (Door Design (Side), Glass (Side))
--   'layout' — layout-level questions (Threshold, Cill)
--   'shared' — cross-range or cross-section (rarely needed)
--
-- condition JSONB: visibility rule evaluated against current picks
--   { "when": { "questionName": "requiredAnswer" } }
--   NULL = always visible
--
-- range_id NULL = question is shared across ranges (unusual; reserved for future)
-- ---------------------------------------------------------------------------
create table public.questions (
  id            uuid     primary key default gen_random_uuid(),
  range_id      uuid     references public.product_ranges(id) on delete cascade,
  external_id   text,    -- portal optionHeadingId (UUID)
  name          text     not null,
  section_scope text     not null default 'door',
  sort_order    smallint not null default 0,
  has_text      boolean  not null default false,
  validation    jsonb    not null default '{}',
  -- { maxLength: int, maxLengthError: text, regex: text, regexError: text }
  condition     jsonb,
  active        boolean  not null default true,
  created_at    timestamptz not null default now()
);

comment on table public.questions is
  'A configuration step in the Specify phase. Belongs to a range (NULL = cross-range). condition drives visibility.';

create index questions_range_idx on public.questions (range_id)
  where range_id is not null;


-- ---------------------------------------------------------------------------
-- options: selectable answers for a question
--
-- metadata JSONB can hold:
--   rgb:        [r, g, b]           — for colour-tint rendering
--   tone:       'black' | 'chrome'  — hardware colour family
--   design_name: text               — for sidelight/cassette lookup
--   filter_id:  uuid (portal)       — finish filter reference
--   image_url:  text                — original portal image URL
-- ---------------------------------------------------------------------------
create table public.options (
  id           uuid     primary key default gen_random_uuid(),
  question_id  uuid     not null references public.questions(id) on delete cascade,
  external_id  text,    -- portal option ID (UUID)
  description  text     not null,
  sort_order   smallint not null default 0,
  is_default   boolean  not null default false,
  metadata     jsonb    not null default '{}',
  created_at   timestamptz not null default now()
);

comment on table public.options is
  'Selectable answer for a question. metadata carries render data (rgb, tone, design_name).';

create index options_question_idx on public.options (question_id, sort_order);
