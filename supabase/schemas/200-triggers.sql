-- ===========================================================================
-- Trigger functions, and the triggers on PUBLIC tables.
--
-- NOTE: the triggers on auth.users that call handle_new_user() and
-- handle_user_email_change() are NOT here. They live declaratively in
-- 210-auth-triggers.sql instead — `supabase db diff` (pg-delta) DOES diff
-- triggers on auth.users, so they belong in the schema files like everything
-- else. See that file's header for the verification behind this.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- Keep updated_at honest.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Signup: create the account row.
--
-- This runs INSIDE GoTrue's signup transaction. Any exception it raises reaches
-- the user as "Database error saving new user" and the signup fails outright,
-- so it must not be able to throw:
--   * `on conflict do nothing` — idempotent against replays.
--   * name falls back through metadata -> email local-part -> a literal, so a
--     user created with no metadata (dashboard, Admin API, SSO) still works.
--   * new.email is nullable (phone-only signup) — hence the coalesce, and hence
--     email being a nullable column.
--
-- raw_user_meta_data is whatever the client passed to signUp({ options: { data } }).
-- It is attacker-controlled: display strings only, never authorization.
--
-- `picture_url` reads BOTH `picture` and `avatar_url` from the metadata: Google
-- and the other OIDC providers put the image at `picture`, while Supabase's own
-- GitHub mapping uses `avatar_url`. Checking only one silently drops the avatar
-- for half the providers wired up in supabase/config.toml.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (id, name, email, picture_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'User'
    ),
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'picture', ''),
      nullif(new.raw_user_meta_data ->> 'avatar_url', '')
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- Keep accounts.email mirroring auth.users.email.
--
-- Without this the column is written once at signup and then silently rots the
-- moment anyone changes their address — the exact drift that kept `email` out
-- of this table in the multi-tenant version of the schema. The trigger is what
-- makes storing it defensible.
--
-- Fires on the auth.users UPDATE that COMMITS the change. GoTrue writes the new
-- address to `email` only after the confirmation link is followed (until then it
-- sits in `email_change`), so this never publishes an unconfirmed address.
--
-- Must not throw, for the same reason handle_new_user() must not: it runs inside
-- GoTrue's own transaction. A missing accounts row simply updates zero rows.
-- ---------------------------------------------------------------------------
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.accounts
  set email = new.email
  where id = new.id;

  return new;
end;
$$;

create trigger set_updated_at before update on public.embed_widgets
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.business_profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.order_items
  for each row execute function public.set_updated_at();

create trigger set_order_number before insert on public.orders
  for each row execute function public.set_order_number();
