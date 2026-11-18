ALTER TABLE "public"."embed_widgets"
  ADD COLUMN "brand_phone" text NOT NULL DEFAULT '01134602305'::text;

ALTER TABLE "public"."embed_widgets"
  ADD CONSTRAINT "embed_widgets_brand_phone_check" CHECK (((char_length(brand_phone) >= 1) AND (char_length(brand_phone) <= 50)));

REVOKE ALL ("brand_phone") ON TABLE "public"."embed_widgets" FROM "authenticated";

GRANT UPDATE ("brand_phone") ON TABLE "public"."embed_widgets" TO "authenticated";
