"use server";
import { revalidatePath, revalidateTag } from "next/cache";

import { authAction } from "@/server/auth-wrapper";

import { WidgetSchema, UpdateWidgetSchema, QuoteStatusSchema } from "./schemas";
export const createWidget = authAction(
  async ({ supabase, user }, input) => {
    const { data: type, error: typeError } = await supabase
      .from("configurator_types")
      .select("id")
      .eq("slug", input.type)
      .single();
    if (typeError || !type)
      return { ok: false as const, error: "This product catalogue is not available yet." };
    const { data, error } = await supabase
      .from("embed_widgets")
      .insert({
        account_id: user.id,
        configurator_type_id: type.id,
        name: input.name,
        website_url: input.website_url,
        brand_name: input.brand_name,
        brand_logo_url: input.brand_logo_url,
        brand_phone: input.brand_phone,
        brand_primary_color: input.brand_primary_color,
        brand_background_color: input.brand_background_color,
        brand_text_color: input.brand_text_color,
      })
      .select("id")
      .single();
    if (error)
      return { ok: false as const, error: "Could not create the component. Please try again." };
    revalidateTag("portal-data", "max");
    revalidatePath("/home", "layout");
    return { ok: true as const, id: data.id };
  },
  { schema: WidgetSchema },
);
export const updateWidget = authAction(
  async ({ supabase }, { id, ...input }) => {
    const { data, error } = await supabase
      .from("embed_widgets")
      .update(input)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error || !data) return { ok: false as const, error: "Could not save this component." };
    revalidateTag("portal-data", "max");
    revalidatePath("/home", "layout");
    return { ok: true as const };
  },
  { schema: UpdateWidgetSchema },
);
export const updateQuoteStatus = authAction(
  async ({ supabase }, { id, status }) => {
    const { data, error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error || !data) return { ok: false as const, error: "Could not update the query." };
    revalidateTag("portal-data", "max");
    revalidatePath("/home", "layout");
    return { ok: true as const };
  },
  { schema: QuoteStatusSchema },
);
