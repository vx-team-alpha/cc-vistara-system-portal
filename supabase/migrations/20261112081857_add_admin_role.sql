ALTER TABLE "public"."accounts"
  ADD COLUMN "role" text NOT NULL DEFAULT 'user'::text;

ALTER TABLE "public"."accounts"
  ADD CONSTRAINT "accounts_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'user'::text])));
