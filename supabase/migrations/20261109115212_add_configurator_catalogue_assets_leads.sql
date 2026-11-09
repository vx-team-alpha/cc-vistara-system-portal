SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."current_account"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."current_account"() FROM "service_role";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "service_role";

REVOKE ALL ON FUNCTION "public"."handle_user_email_change"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."handle_user_email_change"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."handle_user_email_change"() FROM "service_role";

REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM "service_role";

REVOKE ALL ON TABLE "public"."accounts" FROM "anon";

CREATE TABLE "public"."assets" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "hash"         text                     NOT NULL,
  "storage_key"  text                     NOT NULL,
  "external_url" text,
  "mime_type"    text                     NOT NULL,
  "byte_size"    integer                  NOT NULL,
  "cdn_url"      text,
  "uploaded_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "assets_hash_key" UNIQUE (hash),
  CONSTRAINT "assets_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."assets"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."assets" FROM "anon";

CREATE TABLE "public"."configurator_types" (
  "id"    smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "slug"  text     NOT NULL,
  "label" text     NOT NULL,
  CONSTRAINT "configurator_types_pkey" PRIMARY KEY (id),
  CONSTRAINT "configurator_types_slug_key" UNIQUE (slug)
);

ALTER TABLE "public"."configurator_types"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."configurator_types" FROM "anon";

CREATE TABLE "public"."design_styles" (
  "id"         uuid     NOT NULL DEFAULT gen_random_uuid(),
  "range_id"   uuid     NOT NULL,
  "name"       text     NOT NULL,
  "sort_order" smallint NOT NULL DEFAULT 0,
  CONSTRAINT "design_styles_pkey" PRIMARY KEY (id),
  CONSTRAINT "design_styles_range_id_name_key" UNIQUE (range_id, name)
);

ALTER TABLE "public"."design_styles"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."design_styles" FROM "anon";

CREATE TABLE "public"."layouts" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "range_id"    uuid                     NOT NULL,
  "style_id"    uuid,
  "external_id" text,
  "slug"        text                     NOT NULL,
  "name"        text                     NOT NULL,
  "features"    jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "view_box"    text,
  "squares"     smallint,
  "active"      boolean                  NOT NULL DEFAULT true,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "layouts_pkey" PRIMARY KEY (id),
  CONSTRAINT "layouts_range_id_slug_key" UNIQUE (range_id, slug)
);

ALTER TABLE "public"."layouts"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."layouts" FROM "anon";

CREATE TABLE "public"."leads" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "account_id" uuid                     NOT NULL,
  "layout_id"  uuid,
  "name"       text,
  "email"      text,
  "phone"      text,
  "spec"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "source_url" text,
  "status"     text                     NOT NULL DEFAULT 'new'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "leads_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."leads"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."leads" FROM "anon";

CREATE TABLE "public"."options" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "question_id" uuid                     NOT NULL,
  "external_id" text,
  "description" text                     NOT NULL,
  "sort_order"  smallint                 NOT NULL DEFAULT 0,
  "is_default"  boolean                  NOT NULL DEFAULT false,
  "metadata"    jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "options_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."options"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."options" FROM "anon";

CREATE TABLE "public"."product_ranges" (
  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "configurator_type_id" smallint                 NOT NULL,
  "slug"                 text                     NOT NULL,
  "name"                 text                     NOT NULL,
  "source_url"           text,
  "active"               boolean                  NOT NULL DEFAULT true,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_ranges_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_ranges_slug_key" UNIQUE (slug)
);

ALTER TABLE "public"."product_ranges"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."product_ranges" FROM "anon";

CREATE TABLE "public"."questions" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "range_id"      uuid,
  "external_id"   text,
  "name"          text                     NOT NULL,
  "section_scope" text                     NOT NULL DEFAULT 'door'::text,
  "sort_order"    smallint                 NOT NULL DEFAULT 0,
  "has_text"      boolean                  NOT NULL DEFAULT false,
  "validation"    jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "condition"     jsonb,
  "active"        boolean                  NOT NULL DEFAULT true,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "questions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."questions"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."questions" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."configurator_types_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."configurator_types_id_seq" FROM "authenticated";

ALTER TABLE "public"."layouts"
  ADD CONSTRAINT "layouts_style_id_fkey" FOREIGN KEY (style_id) REFERENCES public.design_styles(id) ON DELETE SET NULL;

ALTER TABLE "public"."leads"
  ADD CONSTRAINT "leads_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE "public"."leads"
  ADD CONSTRAINT "leads_layout_id_fkey" FOREIGN KEY (layout_id) REFERENCES public.layouts(id) ON DELETE SET NULL;

ALTER TABLE "public"."product_ranges"
  ADD CONSTRAINT "product_ranges_configurator_type_id_fkey" FOREIGN KEY (configurator_type_id) REFERENCES public.configurator_types(id);

ALTER TABLE "public"."design_styles"
  ADD CONSTRAINT "design_styles_range_id_fkey" FOREIGN KEY (range_id) REFERENCES public.product_ranges(id) ON DELETE CASCADE;

ALTER TABLE "public"."layouts"
  ADD CONSTRAINT "layouts_range_id_fkey" FOREIGN KEY (range_id) REFERENCES public.product_ranges(id) ON DELETE CASCADE;

ALTER TABLE "public"."options"
  ADD CONSTRAINT "options_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;

ALTER TABLE "public"."questions"
  ADD CONSTRAINT "questions_range_id_fkey" FOREIGN KEY (range_id) REFERENCES public.product_ranges(id) ON DELETE CASCADE;

CREATE INDEX design_styles_range_idx ON public.design_styles USING btree (range_id);

CREATE INDEX layouts_range_idx ON public.layouts USING btree (range_id);

CREATE INDEX layouts_style_idx ON public.layouts USING btree (style_id)
  WHERE (style_id IS NOT NULL);

CREATE INDEX leads_account_id_idx ON public.leads USING btree (account_id, created_at DESC);

CREATE INDEX leads_layout_id_idx ON public.leads USING btree (layout_id)
  WHERE (layout_id IS NOT NULL);

CREATE INDEX options_question_idx ON public.options USING btree (question_id, sort_order);

CREATE INDEX product_ranges_type_idx ON public.product_ranges USING btree (configurator_type_id);

CREATE INDEX questions_range_idx ON public.questions USING btree (range_id)
  WHERE (range_id IS NOT NULL);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "assets_select" ON "public"."assets"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "configurator_types_select" ON "public"."configurator_types"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "design_styles_select" ON "public"."design_styles"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "layouts_select" ON "public"."layouts"
  FOR SELECT
  TO "authenticated"
  USING ((active = true));

CREATE POLICY "leads_delete" ON "public"."leads"
  FOR DELETE
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "leads_insert" ON "public"."leads"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "leads_select" ON "public"."leads"
  FOR SELECT
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "leads_update" ON "public"."leads"
  FOR UPDATE
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "options_select" ON "public"."options"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "product_ranges_select" ON "public"."product_ranges"
  FOR SELECT
  TO "authenticated"
  USING ((active = true));

CREATE POLICY "questions_select" ON "public"."questions"
  FOR SELECT
  TO "authenticated"
  USING ((active = true));

COMMENT ON TABLE "public"."assets" IS 'Content-addressed binary assets. hash is immutable — same hash means same file. Never overwrite.';

COMMENT ON TABLE "public"."configurator_types" IS 'Top-level product category. Determines which configurator UI is used.';

COMMENT ON TABLE "public"."design_styles" IS 'Style sub-grouping within a range. Used for door design categories (Traditional / Contemporary / Designer / Stable).';

COMMENT ON TABLE "public"."layouts" IS 'A specific product geometry. Doors: left-hand, sideslab combos (84 per range set). Windows: styles 1–91.';

COMMENT ON TABLE "public"."leads" IS 'Homeowner enquiry submitted through a configurator widget. spec is an immutable snapshot of choices at submission time.';

COMMENT ON TABLE "public"."options" IS 'Selectable answer for a question. metadata carries render data (rgb, tone, design_name).';

COMMENT ON TABLE "public"."product_ranges" IS 'Named product family within a configurator type. One row per scraped range.';

COMMENT ON TABLE "public"."questions" IS 'A configuration step in the Specify phase. Belongs to a range (NULL = cross-range). condition drives visibility.';

REVOKE ALL ON FUNCTION "public"."current_account"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."handle_user_email_change"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;

REVOKE ALL ON SEQUENCE "public"."configurator_types_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."configurator_types_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."configurator_types_id_seq" FROM "service_role";

GRANT SELECT, USAGE ON SEQUENCE "public"."configurator_types_id_seq" TO "service_role";

REVOKE ALL ON TABLE "public"."accounts" FROM "authenticated";

REVOKE ALL ("name") ON TABLE "public"."accounts" FROM "authenticated";

GRANT UPDATE ("name") ON TABLE "public"."accounts" TO "authenticated";

REVOKE ALL ("picture_url") ON TABLE "public"."accounts" FROM "authenticated";

GRANT UPDATE ("picture_url") ON TABLE "public"."accounts" TO "authenticated";

GRANT SELECT ON TABLE "public"."accounts" TO "authenticated";

REVOKE ALL ON TABLE "public"."assets" FROM "authenticated";

GRANT SELECT ON TABLE "public"."assets" TO "authenticated";

REVOKE ALL ON TABLE "public"."assets" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."assets" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."assets" TO "service_role";

REVOKE ALL ON TABLE "public"."configurator_types" FROM "authenticated";

GRANT SELECT ON TABLE "public"."configurator_types" TO "authenticated";

REVOKE ALL ON TABLE "public"."configurator_types" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."configurator_types" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."configurator_types" TO "service_role";

REVOKE ALL ON TABLE "public"."design_styles" FROM "authenticated";

GRANT SELECT ON TABLE "public"."design_styles" TO "authenticated";

REVOKE ALL ON TABLE "public"."design_styles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."design_styles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."design_styles" TO "service_role";

REVOKE ALL ON TABLE "public"."layouts" FROM "authenticated";

GRANT SELECT ON TABLE "public"."layouts" TO "authenticated";

REVOKE ALL ON TABLE "public"."layouts" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."layouts" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."layouts" TO "service_role";

REVOKE ALL ON TABLE "public"."leads" FROM "authenticated";

REVOKE ALL ("status") ON TABLE "public"."leads" FROM "authenticated";

GRANT UPDATE ("status") ON TABLE "public"."leads" TO "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."leads" TO "authenticated";

REVOKE ALL ON TABLE "public"."leads" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."leads" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."leads" TO "service_role";

REVOKE ALL ON TABLE "public"."options" FROM "authenticated";

GRANT SELECT ON TABLE "public"."options" TO "authenticated";

REVOKE ALL ON TABLE "public"."options" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."options" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."options" TO "service_role";

REVOKE ALL ON TABLE "public"."product_ranges" FROM "authenticated";

GRANT SELECT ON TABLE "public"."product_ranges" TO "authenticated";

REVOKE ALL ON TABLE "public"."product_ranges" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_ranges" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_ranges" TO "service_role";

REVOKE ALL ON TABLE "public"."questions" FROM "authenticated";

GRANT SELECT ON TABLE "public"."questions" TO "authenticated";

REVOKE ALL ON TABLE "public"."questions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."questions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."questions" TO "service_role";
