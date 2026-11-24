import "server-only";
import { unstable_cache } from "next/cache";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const STABLE_DOOR_RANGE_SLUG = "gripcore-stable";

export type EmbedProduct = {
  id: string;
  name: string;
  range_id: string;
  image: string;
};

export type EmbedCatalogue = {
  ranges: { id: string; name: string }[];
  products: EmbedProduct[];
};

async function fetchEmbedCatalogue(configuratorTypeId: number): Promise<EmbedCatalogue> {
  const db = getSupabaseAdminClient();
  const { data: ranges, error: rangeError } = await db
    .from("product_ranges")
    .select("id,name")
    .eq("configurator_type_id", configuratorTypeId)
    .eq("active", true)
    .neq("slug", STABLE_DOOR_RANGE_SLUG);
  if (rangeError) throw new Error("Could not load product ranges.");

  const { data: layouts, error: layoutError } = ranges?.length
    ? await db
        .from("layouts")
        .select("id,name,range_id,features")
        .in(
          "range_id",
          ranges.map((r) => r.id),
        )
        .eq("active", true)
        .eq("features->>kind", "layout")
        .order("name")
    : { data: [], error: null };
  if (layoutError) throw new Error("Could not load products.");

  let assetPaths: Record<string, string> = {};
  if (layouts?.length) {
    const { data: assetMap } = await db
      .from("assets")
      .select("cdn_url")
      .eq("external_url", "frontage://asset-map")
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assetMap?.cdn_url) {
      try {
        const response = await fetch(assetMap.cdn_url, { cache: "force-cache" });
        if (response.ok) assetPaths = await response.json();
      } catch {
        /* Keep the gallery available if previews cannot be loaded. */
      }
    }
  }

  const products = (layouts || []).map((row) => {
    const features = row.features as Record<string, unknown>;
    const source = features.source as
      | {
          views?: Record<string, { src?: string }>;
          style?: { styleSvg?: string };
          slim?: { svg?: string };
        }
      | undefined;
    const imagePath =
      source?.views?.["1"]?.src || source?.style?.styleSvg || source?.slim?.svg || "";
    const marker = "advance70-casement/";
    const index = imagePath.indexOf(marker);
    const image =
      assetPaths[imagePath] ||
      (index >= 0 ? assetPaths[`/window-data/${imagePath.slice(index + marker.length)}`] : "") ||
      (/^(https?:\/\/)/.test(imagePath) ? imagePath : "");
    return { id: row.id, name: row.name, range_id: row.range_id, image };
  });

  return { ranges: ranges || [], products };
}

const cachedEmbedCatalogue = unstable_cache(
  async (configuratorTypeId: number): Promise<EmbedCatalogue> => {
    return fetchEmbedCatalogue(configuratorTypeId);
  },
  ["embed-catalogue-without-stable-doors"],
  { revalidate: 3600, tags: ["catalogue"] },
);

export async function loadEmbedCatalogue(configuratorTypeId: number): Promise<EmbedCatalogue> {
  const cached = await cachedEmbedCatalogue(configuratorTypeId);
  // Guard against stale empty cache (e.g. if requested before DB seed)
  if (!cached || !cached.products || cached.products.length === 0) {
    return fetchEmbedCatalogue(configuratorTypeId);
  }
  return cached;
}
