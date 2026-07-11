-- ===========================================================================
-- Triggers on auth.users.
--
-- pg-delta DOES diff triggers on auth.users (verified against CLI 2.109.1: with
-- this trigger present in the database but absent from the schema files, the
-- diff emitted `DROP TRIGGER on_auth_user_created ON auth.users`). So it is
-- declarative like everything else, and must live here — if you put it only in
-- a hand-written migration, the next diff will drop it.
--
-- Only *triggers* on auth.users belong here. Never add tables, columns, or
-- constraints in the auth schema: that is GoTrue's, and a diff against a linked
-- project would try to reconcile GoTrue's own migration state.
-- ===========================================================================

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- `update of email` narrows this to statements that touch the column at all;
-- the WHEN clause then skips the no-op writes GoTrue makes on every sign-in
-- (last_sign_in_at and friends touch the row without changing the address).
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();
