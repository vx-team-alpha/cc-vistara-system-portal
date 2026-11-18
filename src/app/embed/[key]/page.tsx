import { notFound } from "next/navigation";
import { z } from "zod";

import { PublicEmbed } from "@/components/portal/public-embed";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadEmbedCatalogue } from "@/server/portal/embed-products";

import s from "@/components/portal/portal.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Choose your product · Vistara",
  robots: { index: false, follow: false },
};

export default async function EmbedPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!z.uuid().safeParse(key).success) notFound();
  const db = getSupabaseAdminClient();
  const { data: widget, error } = await db
    .from("embed_widgets")
    .select(
      "configurator_type_id,brand_name,brand_logo_url,brand_phone,brand_primary_color,brand_background_color,brand_text_color",
    )
    .eq("public_key", key)
    .eq("enabled", true)
    .maybeSingle();
  if (error) throw new Error("Could not load this component.");
  if (!widget) {
    return (
      <div className={`${s.app} ${s.embed}`} data-embed-root>
        <div className={s.empty}>
          <h1>This component is unavailable</h1>
          <p>Please contact the website owner for help with your enquiry.</p>
        </div>
      </div>
    );
  }
  const { ranges, products } = await loadEmbedCatalogue(widget.configurator_type_id);
  return (
    <div className={`${s.app} ${s.embed}`} data-embed-root>
      <PublicEmbed
        publicKey={key}
        ranges={ranges}
        products={products}
        branding={{
          name: widget.brand_name,
          logoUrl: widget.brand_logo_url,
          phone: widget.brand_phone,
          primaryColor: widget.brand_primary_color,
          backgroundColor: widget.brand_background_color,
          textColor: widget.brand_text_color,
        }}
      />
    </div>
  );
}
