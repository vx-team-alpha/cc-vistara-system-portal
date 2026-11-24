SET local check_function_bodies = off;

CREATE TABLE "public"."business_profiles" (
  "account_id"    uuid                     NOT NULL,
  "business_name" text                     NOT NULL DEFAULT ''::text,
  "phone"         text                     NOT NULL DEFAULT ''::text,
  "address"       text                     NOT NULL DEFAULT ''::text,
  "city"          text                     NOT NULL DEFAULT ''::text,
  "state"         text                     NOT NULL DEFAULT ''::text,
  "zip_code"      text                     NOT NULL DEFAULT ''::text,
  "logo_url"      text                     NOT NULL DEFAULT ''::text,
  "pdf_footer"    text                     NOT NULL DEFAULT ''::text,
  "order_prefix"  text                     NOT NULL DEFAULT 'ORD'::text,
  "timezone"      text                     NOT NULL DEFAULT 'UTC'::text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "business_profiles_order_prefix_check" CHECK ((order_prefix ~ '^[A-Z0-9]{1,10}$'::text)),
  CONSTRAINT "business_profiles_pkey" PRIMARY KEY (account_id)
);

ALTER TABLE "public"."business_profiles"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."business_profiles" FROM "anon";

CREATE TABLE "public"."customers" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "account_id"       uuid                     NOT NULL,
  "name"             text                     NOT NULL,
  "phone"            text                     NOT NULL,
  "phone_normalized" text                     NOT NULL,
  "address"          text                     NOT NULL,
  "city"             text                     NOT NULL,
  "state"            text                     NOT NULL,
  "zip_code"         text                     NOT NULL,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "customers_address_check" CHECK (((char_length(btrim(address)) >= 1) AND (char_length(btrim(address)) <= 240))),
  CONSTRAINT "customers_city_check" CHECK (((char_length(btrim(city)) >= 1) AND (char_length(btrim(city)) <= 120))),
  CONSTRAINT "customers_id_account_id_key" UNIQUE (id, account_id),
  CONSTRAINT "customers_name_check" CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 120))),
  CONSTRAINT "customers_phone_check" CHECK (((char_length(btrim(phone)) >= 1) AND (char_length(btrim(phone)) <= 50))),
  CONSTRAINT "customers_phone_normalized_check" CHECK (((char_length(phone_normalized) >= 3) AND (char_length(phone_normalized) <= 30))),
  CONSTRAINT "customers_pkey" PRIMARY KEY (id),
  CONSTRAINT "customers_state_check" CHECK (((char_length(btrim(state)) >= 1) AND (char_length(btrim(state)) <= 120))),
  CONSTRAINT "customers_zip_code_check" CHECK (((char_length(btrim(zip_code)) >= 1) AND (char_length(btrim(zip_code)) <= 20)))
);

ALTER TABLE "public"."customers"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."customers" FROM "anon";

CREATE TABLE "public"."order_documents" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "order_id"            uuid                     NOT NULL,
  "account_id"          uuid                     NOT NULL,
  "document_type"       text                     NOT NULL,
  "revision"            integer                  NOT NULL,
  "storage_key"         text                     NOT NULL,
  "checksum"            text                     NOT NULL,
  "generation_metadata" jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_documents_document_type_check" CHECK ((document_type = ANY (ARRAY['specification'::text, 'confirmation'::text, 'works_order'::text]))),
  CONSTRAINT "order_documents_order_id_document_type_revision_key" UNIQUE (order_id, document_type, revision),
  CONSTRAINT "order_documents_pkey" PRIMARY KEY (id),
  CONSTRAINT "order_documents_revision_check" CHECK ((revision > 0))
);

ALTER TABLE "public"."order_documents"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."order_documents" FROM "anon";

CREATE TABLE "public"."order_events" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "order_id"        uuid                     NOT NULL,
  "account_id"      uuid                     NOT NULL,
  "event_type"      text                     NOT NULL,
  "previous_status" text,
  "next_status"     text,
  "revision"        integer                  NOT NULL,
  "metadata"        jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."order_events"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."order_events" FROM "anon";

CREATE TABLE "public"."order_items" (
  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "order_id"               uuid                     NOT NULL,
  "account_id"             uuid                     NOT NULL,
  "line_number"            smallint                 NOT NULL,
  "layout_id"              uuid,
  "system"                 text                     NOT NULL DEFAULT 'eurocell'::text,
  "width_mm"               integer                  NOT NULL,
  "height_mm"              integer                  NOT NULL,
  "quantity"               integer                  NOT NULL DEFAULT 1,
  "location"               text                     NOT NULL DEFAULT ''::text,
  "configuration"          jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "catalogue_snapshot"     jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "manufacturing_snapshot" jsonb,
  "outside_drawing"        text,
  "inside_drawing"         text,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_items_height_mm_check" CHECK (((height_mm >= 1750) AND (height_mm <= 2500))),
  CONSTRAINT "order_items_line_number_check" CHECK ((line_number > 0)),
  CONSTRAINT "order_items_location_check" CHECK ((char_length(location) <= 120)),
  CONSTRAINT "order_items_order_id_line_number_key" UNIQUE (order_id, line_number),
  CONSTRAINT "order_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "order_items_quantity_check" CHECK (((quantity >= 1) AND (quantity <= 999))),
  CONSTRAINT "order_items_system_check" CHECK ((system = 'eurocell'::text)),
  CONSTRAINT "order_items_width_mm_check" CHECK (((width_mm >= 300) AND (width_mm <= 2800)))
);

ALTER TABLE "public"."order_items"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."order_items" FROM "anon";

CREATE TABLE "public"."orders" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "account_id"        uuid                     NOT NULL,
  "customer_id"       uuid                     NOT NULL,
  "sequence_number"   bigint                   NOT NULL,
  "order_number"      text                     NOT NULL,
  "status"            text                     NOT NULL DEFAULT 'draft'::text,
  "customer_snapshot" jsonb                    NOT NULL,
  "delivery_date"     date,
  "note"              text                     NOT NULL DEFAULT ''::text,
  "revision"          integer                  NOT NULL DEFAULT 1,
  "issued_at"         timestamp with time zone,
  "confirmed_at"      timestamp with time zone,
  "production_at"     timestamp with time zone,
  "completed_at"      timestamp with time zone,
  "cancelled_at"      timestamp with time zone,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "orders_account_id_order_number_key" UNIQUE (account_id, order_number),
  CONSTRAINT "orders_account_id_sequence_number_key" UNIQUE (account_id, sequence_number),
  CONSTRAINT "orders_id_account_id_key" UNIQUE (id, account_id),
  CONSTRAINT "orders_note_check" CHECK ((char_length(note) <= 4000)),
  CONSTRAINT "orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "orders_revision_check" CHECK ((revision > 0)),
  CONSTRAINT "orders_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'issued'::text, 'confirmed'::text, 'in_production'::text, 'completed'::text, 'cancelled'::text])))
);

ALTER TABLE "public"."orders"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."orders" FROM "anon";

CREATE OR REPLACE FUNCTION public.set_order_number()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."set_order_number"() FROM PUBLIC, "anon", "authenticated", "service_role";

ALTER TABLE "public"."business_profiles"
  ADD CONSTRAINT "business_profiles_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE "public"."customers"
  ADD CONSTRAINT "customers_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE "public"."order_documents"
  ADD CONSTRAINT "order_documents_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE "public"."order_events"
  ADD CONSTRAINT "order_events_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE "public"."order_items"
  ADD CONSTRAINT "order_items_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE "public"."order_items"
  ADD CONSTRAINT "order_items_layout_id_fkey" FOREIGN KEY (layout_id) REFERENCES public.layouts(id) ON DELETE RESTRICT;

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_customer_id_account_id_fkey" FOREIGN KEY (customer_id, account_id) REFERENCES public.customers(id, account_id) ON DELETE RESTRICT;

ALTER TABLE "public"."order_documents"
  ADD CONSTRAINT "order_documents_order_id_account_id_fkey" FOREIGN KEY (order_id, account_id) REFERENCES public.orders(id, account_id) ON DELETE CASCADE;

ALTER TABLE "public"."order_events"
  ADD CONSTRAINT "order_events_order_id_account_id_fkey" FOREIGN KEY (order_id, account_id) REFERENCES public.orders(id, account_id) ON DELETE CASCADE;

ALTER TABLE "public"."order_items"
  ADD CONSTRAINT "order_items_order_id_account_id_fkey" FOREIGN KEY (order_id, account_id) REFERENCES public.orders(id, account_id) ON DELETE CASCADE;

CREATE INDEX customers_account_name_idx ON public.customers USING btree (account_id, lower(name));

CREATE INDEX customers_account_phone_idx ON public.customers USING btree (account_id, phone_normalized);

CREATE INDEX order_documents_order_idx ON public.order_documents USING btree (order_id, created_at DESC);

CREATE INDEX order_events_order_idx ON public.order_events USING btree (order_id, created_at DESC);

CREATE INDEX order_items_account_idx ON public.order_items USING btree (account_id, updated_at DESC);

CREATE INDEX order_items_order_idx ON public.order_items USING btree (order_id, line_number);

CREATE INDEX orders_account_delivery_idx ON public.orders USING btree (account_id, delivery_date)
  WHERE (delivery_date IS NOT NULL);

CREATE INDEX orders_account_status_idx ON public.orders USING btree (account_id, status, updated_at DESC);

CREATE INDEX orders_customer_idx ON public.orders USING btree (customer_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "business_profiles_insert" ON "public"."business_profiles"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "business_profiles_select" ON "public"."business_profiles"
  FOR SELECT
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "business_profiles_update" ON "public"."business_profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "customers_delete" ON "public"."customers"
  FOR DELETE
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "customers_insert" ON "public"."customers"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "customers_select" ON "public"."customers"
  FOR SELECT
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "customers_update" ON "public"."customers"
  FOR UPDATE
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "order_documents_select" ON "public"."order_documents"
  FOR SELECT
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "order_events_insert" ON "public"."order_events"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "order_events_select" ON "public"."order_events"
  FOR SELECT
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "order_items_delete" ON "public"."order_items"
  FOR DELETE
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "order_items_insert" ON "public"."order_items"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "order_items_select" ON "public"."order_items"
  FOR SELECT
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "order_items_update" ON "public"."order_items"
  FOR UPDATE
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "orders_delete_draft" ON "public"."orders"
  FOR DELETE
  TO "authenticated"
  USING (((account_id = ( SELECT auth.uid() AS uid)) AND (status = 'draft'::text)));

CREATE POLICY "orders_insert" ON "public"."orders"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "orders_select" ON "public"."orders"
  FOR SELECT
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "orders_update" ON "public"."orders"
  FOR UPDATE
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((account_id = ( SELECT auth.uid() AS uid)));

REVOKE ALL ON FUNCTION "public"."set_order_number"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_order_number"() TO "postgres";

REVOKE ALL ON TABLE "public"."business_profiles" FROM "authenticated";

REVOKE ALL ("address") ON TABLE "public"."business_profiles" FROM "authenticated";

GRANT UPDATE ("address") ON TABLE "public"."business_profiles" TO "authenticated";

REVOKE ALL ("business_name") ON TABLE "public"."business_profiles" FROM "authenticated";

GRANT UPDATE ("business_name") ON TABLE "public"."business_profiles" TO "authenticated";

REVOKE ALL ("city") ON TABLE "public"."business_profiles" FROM "authenticated";

GRANT UPDATE ("city") ON TABLE "public"."business_profiles" TO "authenticated";

REVOKE ALL ("logo_url") ON TABLE "public"."business_profiles" FROM "authenticated";

GRANT UPDATE ("logo_url") ON TABLE "public"."business_profiles" TO "authenticated";

REVOKE ALL ("order_prefix") ON TABLE "public"."business_profiles" FROM "authenticated";

GRANT UPDATE ("order_prefix") ON TABLE "public"."business_profiles" TO "authenticated";

REVOKE ALL ("pdf_footer") ON TABLE "public"."business_profiles" FROM "authenticated";

GRANT UPDATE ("pdf_footer") ON TABLE "public"."business_profiles" TO "authenticated";

REVOKE ALL ("phone") ON TABLE "public"."business_profiles" FROM "authenticated";

GRANT UPDATE ("phone") ON TABLE "public"."business_profiles" TO "authenticated";

REVOKE ALL ("state") ON TABLE "public"."business_profiles" FROM "authenticated";

GRANT UPDATE ("state") ON TABLE "public"."business_profiles" TO "authenticated";

REVOKE ALL ("timezone") ON TABLE "public"."business_profiles" FROM "authenticated";

GRANT UPDATE ("timezone") ON TABLE "public"."business_profiles" TO "authenticated";

REVOKE ALL ("zip_code") ON TABLE "public"."business_profiles" FROM "authenticated";

GRANT UPDATE ("zip_code") ON TABLE "public"."business_profiles" TO "authenticated";

GRANT INSERT, SELECT ON TABLE "public"."business_profiles" TO "authenticated";

REVOKE ALL ON TABLE "public"."business_profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."business_profiles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."business_profiles" TO "service_role";

REVOKE ALL ON TABLE "public"."customers" FROM "authenticated";

REVOKE ALL ("address") ON TABLE "public"."customers" FROM "authenticated";

GRANT UPDATE ("address") ON TABLE "public"."customers" TO "authenticated";

REVOKE ALL ("city") ON TABLE "public"."customers" FROM "authenticated";

GRANT UPDATE ("city") ON TABLE "public"."customers" TO "authenticated";

REVOKE ALL ("name") ON TABLE "public"."customers" FROM "authenticated";

GRANT UPDATE ("name") ON TABLE "public"."customers" TO "authenticated";

REVOKE ALL ("phone_normalized") ON TABLE "public"."customers" FROM "authenticated";

GRANT UPDATE ("phone_normalized") ON TABLE "public"."customers" TO "authenticated";

REVOKE ALL ("phone") ON TABLE "public"."customers" FROM "authenticated";

GRANT UPDATE ("phone") ON TABLE "public"."customers" TO "authenticated";

REVOKE ALL ("state") ON TABLE "public"."customers" FROM "authenticated";

GRANT UPDATE ("state") ON TABLE "public"."customers" TO "authenticated";

REVOKE ALL ("zip_code") ON TABLE "public"."customers" FROM "authenticated";

GRANT UPDATE ("zip_code") ON TABLE "public"."customers" TO "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."customers" TO "authenticated";

REVOKE ALL ON TABLE "public"."customers" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customers" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customers" TO "service_role";

REVOKE ALL ON TABLE "public"."order_documents" FROM "authenticated";

GRANT SELECT ON TABLE "public"."order_documents" TO "authenticated";

REVOKE ALL ON TABLE "public"."order_documents" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_documents" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_documents" TO "service_role";

REVOKE ALL ON TABLE "public"."order_events" FROM "authenticated";

GRANT INSERT, SELECT ON TABLE "public"."order_events" TO "authenticated";

REVOKE ALL ON TABLE "public"."order_events" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_events" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_events" TO "service_role";

REVOKE ALL ON TABLE "public"."order_items" FROM "authenticated";

REVOKE ALL ("catalogue_snapshot") ON TABLE "public"."order_items" FROM "authenticated";

GRANT UPDATE ("catalogue_snapshot") ON TABLE "public"."order_items" TO "authenticated";

REVOKE ALL ("configuration") ON TABLE "public"."order_items" FROM "authenticated";

GRANT UPDATE ("configuration") ON TABLE "public"."order_items" TO "authenticated";

REVOKE ALL ("height_mm") ON TABLE "public"."order_items" FROM "authenticated";

GRANT UPDATE ("height_mm") ON TABLE "public"."order_items" TO "authenticated";

REVOKE ALL ("inside_drawing") ON TABLE "public"."order_items" FROM "authenticated";

GRANT UPDATE ("inside_drawing") ON TABLE "public"."order_items" TO "authenticated";

REVOKE ALL ("layout_id") ON TABLE "public"."order_items" FROM "authenticated";

GRANT UPDATE ("layout_id") ON TABLE "public"."order_items" TO "authenticated";

REVOKE ALL ("line_number") ON TABLE "public"."order_items" FROM "authenticated";

GRANT UPDATE ("line_number") ON TABLE "public"."order_items" TO "authenticated";

REVOKE ALL ("location") ON TABLE "public"."order_items" FROM "authenticated";

GRANT UPDATE ("location") ON TABLE "public"."order_items" TO "authenticated";

REVOKE ALL ("manufacturing_snapshot") ON TABLE "public"."order_items" FROM "authenticated";

GRANT UPDATE ("manufacturing_snapshot") ON TABLE "public"."order_items" TO "authenticated";

REVOKE ALL ("outside_drawing") ON TABLE "public"."order_items" FROM "authenticated";

GRANT UPDATE ("outside_drawing") ON TABLE "public"."order_items" TO "authenticated";

REVOKE ALL ("quantity") ON TABLE "public"."order_items" FROM "authenticated";

GRANT UPDATE ("quantity") ON TABLE "public"."order_items" TO "authenticated";

REVOKE ALL ("system") ON TABLE "public"."order_items" FROM "authenticated";

GRANT UPDATE ("system") ON TABLE "public"."order_items" TO "authenticated";

REVOKE ALL ("width_mm") ON TABLE "public"."order_items" FROM "authenticated";

GRANT UPDATE ("width_mm") ON TABLE "public"."order_items" TO "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."order_items" TO "authenticated";

REVOKE ALL ON TABLE "public"."order_items" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_items" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_items" TO "service_role";

REVOKE ALL ON TABLE "public"."orders" FROM "authenticated";

REVOKE ALL ("cancelled_at") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("cancelled_at") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("completed_at") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("completed_at") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("confirmed_at") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("confirmed_at") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("customer_snapshot") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("customer_snapshot") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("delivery_date") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("delivery_date") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("issued_at") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("issued_at") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("note") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("note") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("production_at") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("production_at") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("revision") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("revision") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("status") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("status") ON TABLE "public"."orders" TO "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ON TABLE "public"."orders" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."orders" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."orders" TO "service_role";
