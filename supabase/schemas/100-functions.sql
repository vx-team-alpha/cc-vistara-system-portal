-- ===========================================================================
-- Helper functions.
--
-- WHY `security definer` HERE:
--   The SELECT grant on accounts (999-grants.sql) is column-restricted, and
--   column privileges apply to columns referenced in a WHERE clause too — not
--   just the select-list. `security definer` runs the body as the function
--   owner (postgres, who owns the table), so the body is exempt from both the
--   column grant and RLS.
--
-- WHY `set search_path = ''`:
--   A security-definer function with a mutable search_path is a privilege-
--   escalation vector. Everything below is schema-qualified as a result.
--
-- This file must sort AFTER the table files: check_function_bodies is on, so a
-- `language sql` body is parsed at CREATE time and its tables must exist.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- The caller's own account row, in full.
--
-- Set-returning (0 or 1 rows) rather than a strict scalar return so a caller
-- with no account row gets an empty set instead of an error inside the
-- function — callers use `.maybeSingle()` and handle "no row" themselves.
--
-- Note there is no `current_account_id()` any more: the account id IS
-- auth.uid() now that accounts.id references auth.users directly, so any code
-- that needs just the id should use auth.uid() and skip the round trip.
-- ---------------------------------------------------------------------------
create or replace function public.current_account()
returns setof public.accounts
language sql
stable
security definer
set search_path = ''
as $$
  select a.*
  from public.accounts a
  where a.id = (select auth.uid());
$$;

-- Allocate a sequential, business-prefixed order number safely when multiple
-- requests create orders at the same time. The per-account advisory lock keeps
-- the max+1 calculation serial without blocking other accounts.
create or replace function public.set_order_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_number bigint;
  prefix text;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.account_id::text, 0)
  );

  select coalesce(max(o.sequence_number), 0) + 1
    into next_number
    from public.orders o
   where o.account_id = new.account_id;

  select coalesce(nullif(bp.order_prefix, ''), 'ORD')
    into prefix
    from public.business_profiles bp
   where bp.account_id = new.account_id;

  new.sequence_number := next_number;
  new.order_number := coalesce(prefix, 'ORD') || '-' || lpad(next_number::text, 6, '0');
  return new;
end;
$$;

-- Permanently delete one eligible order and retain only a minimal audit
-- tombstone. The operation is intentionally atomic: an audit row can never be
-- left behind for an order that failed to delete (or vice versa).
create or replace function public.delete_order_permanently(
  target_order_id uuid,
  confirmed_order_number text,
  deletion_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.accounts a
    where a.id = actor_id and a.role = 'admin'
  ) then
    raise exception 'Administrator access required';
  end if;

  if char_length(btrim(deletion_reason)) not between 5 and 500 then
    raise exception 'Enter a deletion reason between 5 and 500 characters';
  end if;

  select o.*
    into target_order
    from public.orders o
   where o.id = target_order_id
     and o.account_id = actor_id
   for update;

  if not found then
    return false;
  end if;

  if target_order.status not in ('draft', 'cancelled') then
    raise exception 'Only draft or cancelled orders can be permanently deleted';
  end if;

  if target_order.order_number <> btrim(confirmed_order_number) then
    raise exception 'Order number confirmation does not match';
  end if;

  insert into public.order_deletion_audits (
    account_id,
    order_id,
    order_number,
    deleted_by,
    reason
  ) values (
    target_order.account_id,
    target_order.id,
    target_order.order_number,
    actor_id,
    btrim(deletion_reason)
  );

  delete from public.orders where id = target_order.id;
  return true;
end;
$$;

-- Keep the documented order lifecycle true even when a caller bypasses the
-- application UI and writes through PostgREST directly.
create or replace function public.enforce_order_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  transition_allowed boolean;
begin
  if new.revision <> old.revision + 1 then
    raise exception 'Order revision must increase by exactly one';
  end if;

  if old.status = new.status then
    if old.status <> 'draft' then
      raise exception 'Non-draft orders are immutable';
    end if;
    return new;
  end if;

  transition_allowed := case old.status
    when 'draft' then new.status in ('issued', 'cancelled')
    when 'issued' then new.status in ('confirmed', 'cancelled')
    when 'confirmed' then new.status in ('in_production', 'cancelled')
    when 'in_production' then new.status in ('completed', 'cancelled')
    else false
  end;

  if not transition_allowed then
    raise exception 'Invalid order status transition from % to %', old.status, new.status;
  end if;

  if new.customer_snapshot is distinct from old.customer_snapshot
    or new.delivery_date is distinct from old.delivery_date
    or new.note is distinct from old.note then
    raise exception 'Order details cannot change during a status transition';
  end if;

  if old.status = 'draft' and new.status = 'issued' then
    if not exists (
      select 1 from public.order_items oi where oi.order_id = old.id
    ) then
      raise exception 'An order needs at least one configured door before issue';
    end if;

    if exists (
      select 1
      from public.order_items oi
      where oi.order_id = old.id
        and (
          coalesce(oi.configuration ->> 'design_id', '') = ''
          or coalesce(jsonb_typeof(oi.configuration -> 'picks'), '') <> 'object'
          or oi.configuration -> 'picks' = '{}'::jsonb
          or coalesce(jsonb_typeof(oi.configuration -> 'particulars'), '') <> 'array'
          or oi.configuration -> 'particulars' = '[]'::jsonb
        )
    ) then
      raise exception 'Every door must be fully configured before issue';
    end if;
  end if;

  return new;
end;
$$;
