-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE FUNCTION public.handle_user_email_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  update public.accounts
  set email = new.email
  where id = new.id;

  return new;
end;
$function$;

CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (old.email::text IS DISTINCT FROM new.email::text)
  EXECUTE FUNCTION public.handle_user_email_change();

CREATE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

CREATE TABLE public.accounts (
  id          uuid                     NOT NULL,
  name        text                     NOT NULL,
  email       text,
  picture_url text,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  updated_at  timestamp with time zone DEFAULT now() NOT NULL
);

CREATE FUNCTION public.current_account()
  RETURNS SETOF public.accounts
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select a.*
  from public.accounts a
  where a.id = (select auth.uid());
$function$;

GRANT ALL ON FUNCTION public.current_account() TO authenticated;

COMMENT ON TABLE public.accounts IS 'One row per auth user, created by handle_new_user(). id IS the auth.users id.';

ALTER TABLE public.accounts
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

GRANT SELECT ON public.accounts TO authenticated;

GRANT UPDATE (name, picture_url) ON public.accounts TO authenticated;

GRANT ALL ON public.accounts TO service_role;

-- =============================================================================
-- HAND-EDITED: pg-delta does not emit MAINTAIN/REFERENCES/TRIGGER/TRUNCATE
-- revokes for anon/authenticated, even though all three diff engines report
-- them as drift against the schema files. Added to match
-- supabase/schemas/999-grants.sql. Re-running `pnpm supabase:diff` against
-- this state should produce an empty diff.
-- =============================================================================
REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.accounts FROM anon, authenticated;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY accounts_select ON public.accounts
  FOR SELECT
  TO authenticated
  USING ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY accounts_update ON public.accounts
  FOR UPDATE
  TO authenticated
  USING ((id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((id = ( SELECT auth.uid() AS uid)));