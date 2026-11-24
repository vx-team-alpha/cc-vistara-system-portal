import Link from "next/link";

import { OrderTable } from "@/components/portal/order-table";
import { Card, PageHead, portalStyles as s } from "@/components/portal/ui";
import { getOrders } from "@/server/orders/data";
import { OrderListSchema } from "@/server/orders/schemas";

export const metadata = { title: "Quotes" };

const statuses = [
  ["all", "All"],
  ["draft", "Draft"],
  ["issued", "Issued"],
  ["confirmed", "Confirmed"],
  ["in_production", "In production"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
] as const;

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; query?: string }>;
}) {
  const query = await searchParams;
  const parsed = OrderListSchema.parse({
    status: query.status || "all",
    query: query.query || "",
    page: Math.min(10000, Math.max(1, Math.floor(Number(query.page) || 1))),
  });
  const { data, count } = await getOrders(parsed);
  const pageHref = (page: number) => {
    const params = new URLSearchParams({ status: parsed.status, page: String(page) });
    if (parsed.query) params.set("query", parsed.query);
    return `/home/quotes?${params.toString()}`;
  };

  return (
    <>
      <PageHead title="Quotes" note="Create, resume and follow every customer order.">
        <Link href="/home/quotes/new" className={`${s.btn} ${s.btnPrimary}`}>
          New order
        </Link>
      </PageHead>
      <div className={s.toolbar}>
        <nav className={s.tabs} aria-label="Filter orders by status">
          {statuses.map(([value, label]) => (
            <Link
              className={s.tab}
              href={`/home/quotes?status=${value}${parsed.query ? `&query=${encodeURIComponent(parsed.query)}` : ""}`}
              key={value}
              aria-current={parsed.status === value ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <form action="/home/quotes" method="get" className={s.searchForm}>
          <input type="hidden" name="status" value={parsed.status} />
          <label className={s.srOnly} htmlFor="order-search">
            Search orders
          </label>
          <input
            id="order-search"
            name="query"
            className={s.input}
            defaultValue={parsed.query}
            placeholder="Order, customer or phone"
          />
          <button className={s.btn} type="submit">
            Search
          </button>
        </form>
      </div>
      <Card title="Customer orders" note={`${count} ${count === 1 ? "order" : "orders"}`} flush>
        <OrderTable orders={data} />
      </Card>
      <nav className={s.actions} aria-label="Quote pages">
        {parsed.page > 1 && (
          <Link className={s.btn} href={pageHref(parsed.page - 1)}>
            Previous
          </Link>
        )}
        <span className={s.hint}>Page {parsed.page}</span>
        {parsed.page * 20 < count && (
          <Link className={s.btn} href={pageHref(parsed.page + 1)}>
            Next
          </Link>
        )}
      </nav>
    </>
  );
}
