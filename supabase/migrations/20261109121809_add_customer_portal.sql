CREATE TABLE "public"."embed_widgets" (
  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "account_id"           uuid                     NOT NULL,
  "configurator_type_id" smallint                 NOT NULL,
  "public_key"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"                 text                     NOT NULL,
  "website_url"          text                     NOT NULL DEFAULT ''::text,
  "enabled"              boolean                  NOT NULL DEFAULT true,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "embed_widgets_id_account_id_key" UNIQUE (id, account_id),
  CONSTRAINT "embed_widgets_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 80))),
  CONSTRAINT "embed_widgets_pkey" PRIMARY KEY (id),
  CONSTRAINT "embed_widgets_public_key_key" UNIQUE (public_key),
  CONSTRAINT "embed_widgets_website_url_check" CHECK ((char_length(website_url) <= 500))
);

ALTER TABLE "public"."embed_widgets"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."embed_widgets" FROM "anon";

CREATE TABLE "public"."widget_views" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "widget_id"  uuid                     NOT NULL,
  "account_id" uuid                     NOT NULL,
  "session_id" uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "widget_views_pkey" PRIMARY KEY (id),
  CONSTRAINT "widget_views_widget_id_session_id_key" UNIQUE (widget_id, session_id)
);

ALTER TABLE "public"."widget_views"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."widget_views" FROM "anon";

ALTER TABLE "public"."leads"
  ADD COLUMN "widget_id" uuid;

ALTER TABLE "public"."leads"
  ADD COLUMN "session_id" uuid;

ALTER TABLE "public"."embed_widgets"
  ADD CONSTRAINT "embed_widgets_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE "public"."embed_widgets"
  ADD CONSTRAINT "embed_widgets_configurator_type_id_fkey" FOREIGN KEY (configurator_type_id) REFERENCES public.configurator_types(id);

ALTER TABLE "public"."leads"
  ADD CONSTRAINT "leads_widget_owner_fkey" FOREIGN KEY (widget_id, account_id) REFERENCES public.embed_widgets(id, account_id);

ALTER TABLE "public"."widget_views"
  ADD CONSTRAINT "widget_views_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE "public"."widget_views"
  ADD CONSTRAINT "widget_views_widget_id_account_id_fkey" FOREIGN KEY (widget_id, account_id) REFERENCES public.embed_widgets(id, account_id) ON DELETE CASCADE;

CREATE INDEX embed_widgets_account_idx ON public.embed_widgets USING btree (account_id, created_at DESC);

CREATE INDEX embed_widgets_type_idx ON public.embed_widgets USING btree (configurator_type_id);

CREATE INDEX leads_widget_idx ON public.leads USING btree (widget_id)
  WHERE (widget_id IS NOT NULL);

CREATE UNIQUE INDEX leads_widget_session_idx ON public.leads USING btree (widget_id, session_id)
  WHERE ((widget_id IS NOT NULL) AND (session_id IS NOT NULL));

CREATE INDEX widget_views_account_idx ON public.widget_views USING btree (account_id, created_at DESC);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.embed_widgets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "embed_widgets_insert" ON "public"."embed_widgets"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "embed_widgets_select" ON "public"."embed_widgets"
  FOR SELECT
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "embed_widgets_update" ON "public"."embed_widgets"
  FOR UPDATE
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((account_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "widget_views_select" ON "public"."widget_views"
  FOR SELECT
  TO "authenticated"
  USING ((account_id = ( SELECT auth.uid() AS uid)));

REVOKE ALL ON TABLE "public"."embed_widgets" FROM "authenticated";

REVOKE ALL ("enabled") ON TABLE "public"."embed_widgets" FROM "authenticated";

GRANT UPDATE ("enabled") ON TABLE "public"."embed_widgets" TO "authenticated";

REVOKE ALL ("name") ON TABLE "public"."embed_widgets" FROM "authenticated";

GRANT UPDATE ("name") ON TABLE "public"."embed_widgets" TO "authenticated";

REVOKE ALL ("website_url") ON TABLE "public"."embed_widgets" FROM "authenticated";

GRANT UPDATE ("website_url") ON TABLE "public"."embed_widgets" TO "authenticated";

GRANT INSERT, SELECT ON TABLE "public"."embed_widgets" TO "authenticated";

REVOKE ALL ON TABLE "public"."embed_widgets" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."embed_widgets" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."embed_widgets" TO "service_role";

REVOKE ALL ON TABLE "public"."widget_views" FROM "authenticated";

GRANT SELECT ON TABLE "public"."widget_views" TO "authenticated";

REVOKE ALL ON TABLE "public"."widget_views" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."widget_views" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."widget_views" TO "service_role";
