import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadEmbedCatalogue } from "@/server/portal/embed-products";

export async function loadDoorCatalogue() {
  const db = getSupabaseAdminClient();
  const { data: type, error } = await db
    .from("configurator_types")
    .select("id")
    .eq("slug", "door")
    .single();
  if (error || !type) throw new Error("The door catalogue is not available.");
  return loadEmbedCatalogue(type.id);
}
