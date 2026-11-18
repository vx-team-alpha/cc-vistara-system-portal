ALTER TABLE "public"."embed_widgets"
  ADD COLUMN "brand_name" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."embed_widgets"
  ADD COLUMN "brand_logo_url" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."embed_widgets"
  ADD COLUMN "brand_primary_color" text NOT NULL DEFAULT '#191919'::text;

ALTER TABLE "public"."embed_widgets"
  ADD COLUMN "brand_background_color" text NOT NULL DEFAULT '#f5f5f5'::text;

ALTER TABLE "public"."embed_widgets"
  ADD COLUMN "brand_text_color" text NOT NULL DEFAULT '#191919'::text;

ALTER TABLE "public"."embed_widgets"
  ADD CONSTRAINT "embed_widgets_brand_background_color_check" CHECK ((brand_background_color ~ '^#[0-9a-fA-F]{6}$'::text));

ALTER TABLE "public"."embed_widgets"
  ADD CONSTRAINT "embed_widgets_brand_logo_url_check" CHECK ((char_length(brand_logo_url) <= 500));

ALTER TABLE "public"."embed_widgets"
  ADD CONSTRAINT "embed_widgets_brand_name_check" CHECK ((char_length(brand_name) <= 80));

ALTER TABLE "public"."embed_widgets"
  ADD CONSTRAINT "embed_widgets_brand_primary_color_check" CHECK ((brand_primary_color ~ '^#[0-9a-fA-F]{6}$'::text));

ALTER TABLE "public"."embed_widgets"
  ADD CONSTRAINT "embed_widgets_brand_text_color_check" CHECK ((brand_text_color ~ '^#[0-9a-fA-F]{6}$'::text));

REVOKE ALL ("brand_background_color") ON TABLE "public"."embed_widgets" FROM "authenticated";

GRANT UPDATE ("brand_background_color") ON TABLE "public"."embed_widgets" TO "authenticated";

REVOKE ALL ("brand_logo_url") ON TABLE "public"."embed_widgets" FROM "authenticated";

GRANT UPDATE ("brand_logo_url") ON TABLE "public"."embed_widgets" TO "authenticated";

REVOKE ALL ("brand_name") ON TABLE "public"."embed_widgets" FROM "authenticated";

GRANT UPDATE ("brand_name") ON TABLE "public"."embed_widgets" TO "authenticated";

REVOKE ALL ("brand_primary_color") ON TABLE "public"."embed_widgets" FROM "authenticated";

GRANT UPDATE ("brand_primary_color") ON TABLE "public"."embed_widgets" TO "authenticated";

REVOKE ALL ("brand_text_color") ON TABLE "public"."embed_widgets" FROM "authenticated";

GRANT UPDATE ("brand_text_color") ON TABLE "public"."embed_widgets" TO "authenticated";
