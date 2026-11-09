-- ===========================================================================
-- assets — content-addressed binary files
--
-- Stores metadata for every image and SVG served by the configurator:
-- door elevation SVGs, option tile PNGs, glass unit bitmaps, colour
-- texture images, and window elevation SVGs.
--
-- The hash (SHA-256 of file content) is the immutable identity of each asset.
-- Never overwrite an asset at the same hash — it may be referenced by
-- historical lead specs (leads.spec snapshots) and by other layouts/options.
--
-- external_url records the original portal URL so the scrape pipeline can
-- detect when the upstream asset changes (different content → new hash).
-- ===========================================================================

create table public.assets (
  id           uuid    primary key default gen_random_uuid(),
  hash         text    unique not null,    -- SHA-256 of file content (hex, 64 chars)
  storage_key  text    not null,           -- path in object storage, e.g. 'assets/f7e4d3e8dc4c.jpg'
  external_url text,                       -- original portal URL (scrape audit)
  mime_type    text    not null,
  byte_size    integer not null,
  cdn_url      text,                       -- fully-qualified CDN URL once uploaded
  uploaded_at  timestamptz not null default now()
);

comment on table public.assets is
  'Content-addressed binary assets. hash is immutable — same hash means same file. Never overwrite.';
