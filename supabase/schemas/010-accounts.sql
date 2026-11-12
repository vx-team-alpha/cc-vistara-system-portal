-- ===========================================================================
-- accounts — 1:1 with auth.users. The only application table.
-- ===========================================================================

create table public.accounts (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text,
  picture_url text,
  role        text not null default 'user' check (role in ('admin', 'user')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- `role` is the platform-level role for this account ('admin' | 'user').
-- It is also mirrored into auth.users.app_metadata.role so that the JWT
-- carries it without a DB round-trip. Only service_role may write this column
-- (see 999-grants.sql). Admins change roles via the admin portal, which uses
-- the service-role client.

comment on table public.accounts is
  'One row per auth user, created by handle_new_user(). id IS the auth.users id.';

-- The PK is the auth user id rather than a surrogate key with a separate FK.
-- That makes every RLS policy `id = auth.uid()` — no lookup table, no helper
-- function, and no chance of the two ids drifting apart.

-- `email` is a MIRROR of auth.users.email, kept current by the
-- on_auth_user_email_updated trigger (200-triggers.sql). It exists so the app
-- can render an email without a second query. auth.users remains the source of
-- truth: for anything security-sensitive read the JWT (auth.jwt() ->> 'email'),
-- because this column is eventually-consistent by one transaction.
--
-- Nullable because auth.users.email is nullable (phone-only signup).
