SET local check_function_bodies = off;

DROP POLICY "order_items_delete" ON "public"."order_items";

DROP POLICY "order_items_insert" ON "public"."order_items";

DROP POLICY "order_items_update" ON "public"."order_items";

DROP POLICY "orders_delete_draft" ON "public"."orders";

CREATE TABLE "public"."order_deletion_audits" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "account_id"   uuid                     NOT NULL,
  "order_id"     uuid                     NOT NULL,
  "order_number" text                     NOT NULL,
  "deleted_by"   uuid                     NOT NULL,
  "reason"       text                     NOT NULL,
  "deleted_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_deletion_audits_pkey" PRIMARY KEY (id),
  CONSTRAINT "order_deletion_audits_reason_check" CHECK (((char_length(btrim(reason)) >= 5) AND (char_length(btrim(reason)) <= 500)))
);

ALTER TABLE "public"."order_deletion_audits"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."order_deletion_audits" FROM "anon";

CREATE OR REPLACE FUNCTION public.delete_order_permanently (
  target_order_id        uuid,
  confirmed_order_number text,
  deletion_reason        text
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."delete_order_permanently"(uuid, text, text) FROM PUBLIC, "anon", "service_role";

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
          or jsonb_typeof(oi.configuration -> 'picks') <> 'object'
          or oi.configuration -> 'picks' = '{}'::jsonb
          or jsonb_typeof(oi.configuration -> 'particulars') <> 'array'
          or oi.configuration -> 'particulars' = '[]'::jsonb
        )
    ) then
      raise exception 'Every door must be fully configured before issue';
    end if;
  end if;

  return new;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."enforce_order_lifecycle"() FROM PUBLIC, "anon", "authenticated", "service_role";

ALTER TABLE "public"."order_deletion_audits"
  ADD CONSTRAINT "order_deletion_audits_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE "public"."order_deletion_audits"
  ADD CONSTRAINT "order_deletion_audits_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES public.accounts(id) ON DELETE CASCADE;

CREATE INDEX order_deletion_audits_account_idx ON public.order_deletion_audits USING btree (account_id, deleted_at DESC);

CREATE TRIGGER enforce_order_lifecycle
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_lifecycle();

CREATE POLICY "order_deletion_audits_select_admin" ON "public"."order_deletion_audits"
  FOR SELECT
  TO "authenticated"
  USING (((account_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = ( SELECT auth.uid() AS uid)) AND (a.role = 'admin'::text))))));

CREATE POLICY "order_items_delete" ON "public"."order_items"
  FOR DELETE
  TO "authenticated"
  USING (((account_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.account_id = ( SELECT auth.uid() AS uid)) AND (o.status = 'draft'::text))))));

CREATE POLICY "order_items_insert" ON "public"."order_items"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((account_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.account_id = ( SELECT auth.uid() AS uid)) AND (o.status = 'draft'::text))))));

CREATE POLICY "order_items_update" ON "public"."order_items"
  FOR UPDATE
  TO "authenticated"
  USING (((account_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.account_id = ( SELECT auth.uid() AS uid)) AND (o.status = 'draft'::text))))))
  WITH CHECK (((account_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.account_id = ( SELECT auth.uid() AS uid)) AND (o.status = 'draft'::text))))));

CREATE POLICY "orders_delete_admin" ON "public"."orders"
  FOR DELETE
  TO "authenticated"
  USING (((account_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['draft'::text, 'cancelled'::text])) AND (EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = ( SELECT auth.uid() AS uid)) AND (a.role = 'admin'::text))))));

GRANT EXECUTE ON FUNCTION "public"."delete_order_permanently"(uuid, text, text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."delete_order_permanently"(uuid, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_order_permanently"(uuid, text, text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."enforce_order_lifecycle"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."enforce_order_lifecycle"() TO "postgres";

REVOKE ALL ON TABLE "public"."order_deletion_audits" FROM "authenticated";

GRANT SELECT ON TABLE "public"."order_deletion_audits" TO "authenticated";

REVOKE ALL ON TABLE "public"."order_deletion_audits" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_deletion_audits" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_deletion_audits" TO "service_role";
