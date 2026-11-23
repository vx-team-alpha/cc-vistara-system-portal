import "server-only";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveAuthContext } from "@/server/auth-wrapper/context";
import { UnauthorizedError } from "@/server/auth-wrapper/errors";

const PORTAL_CACHE_TAG = "portal-data";

export const portalContext = cache(async () => {
  try {
    return await resolveAuthContext();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/auth/sign-in?next=%2Fhome");
    throw error;
  }
});

const cachedWidgets = unstable_cache(
  async (accountId: string) => {
    const db = getSupabaseAdminClient();
    const { data, error } = await db
      .from("embed_widgets")
      .select("*, configurator_types(slug,label)")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load embed components.");
    return data;
  },
  ["portal-widgets"],
  { revalidate: 300, tags: [PORTAL_CACHE_TAG] },
);

export async function getWidgets() {
  const { account } = await portalContext();
  return cachedWidgets(account.id);
}

const cachedStats = unstable_cache(
  async (accountId: string) => {
    const db = getSupabaseAdminClient();
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const result = await Promise.all([
      db
        .from("widget_views")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .gte("created_at", since),
      db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .not("widget_id", "is", null)
        .gte("created_at", since),
      db
        .from("embed_widgets")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("enabled", true),
      db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("status", "new"),
    ]);
    if (result.some((r) => r.error)) throw new Error("Could not load portal statistics.");
    return {
      views: result[0].count || 0,
      quotes: result[1].count || 0,
      active: result[2].count || 0,
      pending: result[3].count || 0,
    };
  },
  ["portal-stats"],
  { revalidate: 60, tags: [PORTAL_CACHE_TAG] },
);

export async function getStats() {
  const { account } = await portalContext();
  return cachedStats(account.id);
}

const cachedRecentQuotes = unstable_cache(
  async (accountId: string) => {
    const db = getSupabaseAdminClient();
    const { data, error } = await db
      .from("leads")
      .select("id,name,email,status,created_at,embed_widgets(name)")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw new Error("Could not load recent quote queries.");
    return data;
  },
  ["portal-recent-quotes"],
  { revalidate: 60, tags: [PORTAL_CACHE_TAG] },
);

export async function getRecentQuotes() {
  const { account } = await portalContext();
  return cachedRecentQuotes(account.id);
}

const cachedWidgetDetails = unstable_cache(
  async (accountId: string, id: string) => {
    const db = getSupabaseAdminClient();
    const { data: widget, error } = await db
      .from("embed_widgets")
      .select("*,configurator_types(label)")
      .eq("account_id", accountId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Could not load the component.");
    if (!widget) return null;
    const [views, quotes] = await Promise.all([
      db
        .from("widget_views")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("widget_id", id),
      db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("widget_id", id),
    ]);
    if (views.error || quotes.error) throw new Error("Could not load component statistics.");
    return { widget, views: views.count || 0, quotes: quotes.count || 0 };
  },
  ["portal-widget-details"],
  { revalidate: 120, tags: [PORTAL_CACHE_TAG] },
);

export async function getWidgetDetails(id: string) {
  const { account } = await portalContext();
  return cachedWidgetDetails(account.id, id);
}

const cachedQuotes = unstable_cache(
  async (accountId: string, status: string, page: number) => {
    const db = getSupabaseAdminClient();
    let request = db
      .from("leads")
      .select("id,name,email,status,created_at,embed_widgets(name)", { count: "exact" })
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .range((page - 1) * 20, page * 20 - 1);
    if (status !== "all") request = request.eq("status", status);
    const { data, error, count } = await request;
    if (error) throw new Error("Could not load quote queries.");
    return { data: data || [], count: count || 0 };
  },
  ["portal-quotes"],
  { revalidate: 60, tags: [PORTAL_CACHE_TAG] },
);

export async function getQuotes(status: string, page: number) {
  const { account } = await portalContext();
  return cachedQuotes(account.id, status, page);
}

const cachedQuote = unstable_cache(
  async (accountId: string, id: string) => {
    const db = getSupabaseAdminClient();
    const { data, error } = await db
      .from("leads")
      .select("*,embed_widgets(name)")
      .eq("account_id", accountId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Could not load this query.");
    return data;
  },
  ["portal-quote"],
  { revalidate: 120, tags: [PORTAL_CACHE_TAG] },
);

export async function getQuote(id: string) {
  const { account } = await portalContext();
  return cachedQuote(account.id, id);
}
