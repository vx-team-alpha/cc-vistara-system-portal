import "server-only";
import { unstable_cache } from "next/cache";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { portalContext } from "@/server/portal/data";

import type { OrderListInput } from "./schemas";

const cachedOrderStats = unstable_cache(
  async (accountId: string) => {
    const db = getSupabaseAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const statuses = ["draft", "issued", "confirmed", "in_production"] as const;
    const requests = statuses.map((status) =>
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("status", status),
    );
    const [draft, issued, confirmed, production, dueSoon, overdue] = await Promise.all([
      ...requests,
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .not("status", "in", '("completed","cancelled")')
        .gte("delivery_date", today)
        .lte("delivery_date", dueDate),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .not("status", "in", '("completed","cancelled")')
        .lt("delivery_date", today),
    ]);
    if ([draft, issued, confirmed, production, dueSoon, overdue].some((result) => result.error)) {
      throw new Error("Could not load order statistics.");
    }
    return {
      draft: draft.count || 0,
      issued: issued.count || 0,
      confirmed: confirmed.count || 0,
      production: production.count || 0,
      dueSoon: dueSoon.count || 0,
      overdue: overdue.count || 0,
    };
  },
  ["order-stats"],
  { revalidate: 30, tags: ["orders"] },
);

export async function getOrderStats() {
  const { account } = await portalContext();
  return cachedOrderStats(account.id);
}

const cachedRecentOrders = unstable_cache(
  async (accountId: string) => {
    const db = getSupabaseAdminClient();
    const { data, error } = await db
      .from("orders")
      .select(
        "id,order_number,status,delivery_date,updated_at,customer_snapshot,order_items(quantity)",
      )
      .eq("account_id", accountId)
      .order("updated_at", { ascending: false })
      .limit(6);
    if (error) throw new Error("Could not load recent orders.");
    return data;
  },
  ["recent-orders"],
  { revalidate: 30, tags: ["orders"] },
);

export async function getRecentOrders() {
  const { account } = await portalContext();
  return cachedRecentOrders(account.id);
}

export async function getOrders(input: OrderListInput) {
  const { account } = await portalContext();
  const db = getSupabaseAdminClient();
  let request = db
    .from("orders")
    .select(
      "id,order_number,status,delivery_date,updated_at,customer_snapshot,order_items(quantity,location)",
      {
        count: "exact",
      },
    )
    .eq("account_id", account.id)
    .order("updated_at", { ascending: false })
    .range((input.page - 1) * 20, input.page * 20 - 1);

  if (input.status !== "all") request = request.eq("status", input.status);
  if (input.query) {
    const safe = input.query.replace(/[,%()]/g, " ").trim();
    if (safe)
      request = request.or(
        `order_number.ilike.%${safe}%,customer_snapshot->>name.ilike.%${safe}%,customer_snapshot->>phone.ilike.%${safe}%`,
      );
  }

  const { data, error, count } = await request;
  if (error) throw new Error("Could not load orders.");
  return { data: data || [], count: count || 0 };
}

export async function getOrder(id: string) {
  const { account } = await portalContext();
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("orders")
    .select("*,order_items(*)")
    .eq("account_id", account.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load this order.");
  return data;
}

export async function getOrderPrintData(id: string) {
  const { account } = await portalContext();
  const db = getSupabaseAdminClient();
  const [orderResult, profileResult] = await Promise.all([
    db
      .from("orders")
      .select("*,order_items(*)")
      .eq("account_id", account.id)
      .eq("id", id)
      .maybeSingle(),
    db.from("business_profiles").select("*").eq("account_id", account.id).maybeSingle(),
  ]);
  if (orderResult.error) throw new Error("Could not load this order.");
  if (profileResult.error) throw new Error("Could not load the business details.");
  return { order: orderResult.data, business: profileResult.data };
}
