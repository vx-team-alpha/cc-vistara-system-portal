import { PlusCircle, Search } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { OrderTable } from "@/components/portal/order-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    const params = new URLSearchParams({
      status: parsed.status,
      page: String(page),
    });
    if (parsed.query) params.set("query", parsed.query);
    return `/home/quotes?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes & Orders"
        subtitle="Create, resume and track every customer specification and manufacturing order."
      >
        <Button variant="secondery" size="sm" asChild>
          <Link href="/home/quotes/new" className="flex items-center gap-2">
            <PlusCircle className="size-4" />
            <span>New order</span>
          </Link>
        </Button>
      </PageHeader>

      {/* Toolbar: Status filter pills & Search */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Status Pills */}
        <div className="flex w-fit flex-wrap items-center gap-1.5 rounded-xl border border-border/50 bg-brand-accent3/80 p-1">
          {statuses.map(([value, label]) => {
            const isActive = parsed.status === value;
            return (
              <Button
                key={value}
                asChild
                variant={isActive ? "primary" : "ghost"}
                size="sm"
                className={`text-subtitle h-8 rounded-lg px-3 font-medium transition-all ${
                  isActive
                    ? "bg-brand-accent1 text-brand-accent2 shadow-xs"
                    : "text-brand-txt-primary hover:bg-white hover:text-brand-accent0"
                }`}
              >
                <Link
                  href={`/home/quotes?status=${value}${
                    parsed.query ? `&query=${encodeURIComponent(parsed.query)}` : ""
                  }`}
                >
                  {label}
                </Link>
              </Button>
            );
          })}
        </div>

        {/* Search Input Form */}
        <form
          action="/home/quotes"
          method="get"
          className="flex w-full items-center gap-2 lg:w-auto"
        >
          <input type="hidden" name="status" value={parsed.status} />
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-txt-secondary" />
            <Input
              name="query"
              defaultValue={parsed.query}
              placeholder="Search order, customer or phone..."
              className="text-subtitle h-9 rounded-lg border-border bg-card pl-9"
            />
          </div>
          <Button type="submit" variant="light" size="sm" className="h-9">
            Search
          </Button>
        </form>
      </div>

      {/* Customer Orders Card with Table */}
      <Card className="rounded-2xl border border-border bg-card shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 px-6 py-4.5">
          <div className="space-y-0.5">
            <CardTitle className="text-title-2 font-bold text-brand-txt-primary">
              Customer orders
            </CardTitle>
            <CardDescription className="text-subtitle text-brand-txt-secondary">
              {count} {count === 1 ? "order found" : "orders found"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <OrderTable orders={data} />
        </CardContent>
      </Card>

      {/* Pagination */}
      {count > 20 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-caption text-brand-txt-secondary">
            Page {parsed.page} of {Math.ceil(count / 20)}
          </span>
          <div className="flex items-center gap-2">
            {parsed.page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={pageHref(parsed.page - 1)}>Previous</Link>
              </Button>
            )}
            {parsed.page * 20 < count && (
              <Button variant="outline" size="sm" asChild>
                <Link href={pageHref(parsed.page + 1)}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
