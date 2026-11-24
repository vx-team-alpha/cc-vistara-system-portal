SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.enforce_order_lifecycle()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
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
$function$;
