CREATE OR REPLACE FUNCTION public.enforce_order_lifecycle()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
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

  -- Allow user to switch to any valid order status without restriction
  if new.status not in ('draft', 'issued', 'confirmed', 'in_production', 'completed', 'cancelled') then
    raise exception 'Invalid order status: %', new.status;
  end if;

  return new;
end;
$function$;
