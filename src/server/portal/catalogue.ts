import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";
export async function loadPublicCatalogue(layoutId: string, typeId: number) {
  const db = getSupabaseAdminClient();
  const { data: layout, error } = await db
    .from("layouts")
    .select(
      "id,name,slug,features,product_ranges!inner(slug,name,active,configurator_type_id,configurator_types(slug))",
    )
    .eq("id", layoutId)
    .eq("active", true)
    .eq("features->>kind", "layout")
    .eq("product_ranges.active", true)
    .eq("product_ranges.configurator_type_id", typeId)
    .maybeSingle();
  if (error) throw new Error("Could not load the selected catalogue.");
  if (!layout) return null;
  const { data: mapRecord, error: mapError } = await db
    .from("assets")
    .select("cdn_url")
    .eq("external_url", "frontage://asset-map")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (mapError || !mapRecord?.cdn_url)
    throw new Error("Catalogue asset map is not available. Run the latest catalogue seed.");
  const response = await fetch(mapRecord.cdn_url, { cache: "force-cache" });
  if (!response.ok) throw new Error("Could not load catalogue assets.");
  const paths = (await response.json()) as Record<string, string>;
  const kind = layout.product_ranges.configurator_types.slug;
  const folder = layout.product_ranges.slug.replace(/^advance70-/, "");
  const read = async (key: string): Promise<Json> => {
    if (!paths[key]) throw new Error(`Catalogue source missing: ${key}`);
    const result = await fetch(paths[key], { cache: "force-cache" });
    if (!result.ok) throw new Error("Could not load catalogue source.");
    return result.json();
  };
  const source = (layout.features as Record<string, Json>).source;
  return {
    layout,
    kind,
    source,
    paths,
    urls:
      kind === "door"
        ? { manifest: paths["/catalogue/manifest.json"] }
        : {
            shared: paths[`/window-data/${folder}/questions.json`],
            overrides: paths[`/window-data/${folder}/questions-by-style.json`],
            materials: paths["/window-data/render-materials.json"],
            images: paths[`/window-data/${folder}/option-images.json`],
          },
    read,
  };
}
