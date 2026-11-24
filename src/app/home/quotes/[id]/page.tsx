import type { VariantProps } from "class-variance-authority";
import { ArrowLeft, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { EditOrderDialog } from "@/components/portal/edit-order-dialog";
import { OrderDeleteDialog } from "@/components/portal/order-delete-dialog";
import { OrderItemActions } from "@/components/portal/order-item-actions";
import { OrderStatusForm } from "@/components/portal/order-status-form";
import { formatDate, formatStatus } from "@/components/portal/ui";
import { Badge, type badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { getCurrentAccount } from "@/server/auth-wrapper";
import { getOrder } from "@/server/orders/data";
import type { Json } from "@/types/supabase";

export const metadata = { title: "Order details" };

function snapshot(value: Json) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function getStatusBadgeVariant(status: string): BadgeVariant {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "lime";
    case "in_production":
    case "production":
      return "success";
    case "issued":
      return "blue";
    case "completed":
      return "primary";
    case "cancelled":
      return "destructive";
    case "draft":
    default:
      return "secondary";
  }
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  if (!z.uuid().safeParse(id).success) notFound();
  const [order, account] = await Promise.all([getOrder(id), getCurrentAccount()]);
  if (!order) notFound();
  const customer = snapshot(order.customer_snapshot);
  const badgeVariant = getStatusBadgeVariant(order.status);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 gap-1.5 text-brand-txt-secondary hover:text-brand-txt-primary"
        >
          <Link href="/home/quotes">
            <ArrowLeft className="size-4" />
            <span>Back to Quotes</span>
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <PageHeader
        title={order.order_number}
        subtitle={`Created ${formatDate(order.created_at)}${
          order.delivery_date ? ` · Estimated Delivery ${formatDate(order.delivery_date)}` : ""
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badgeVariant} className="px-3 py-1 text-xs">
            {formatStatus(order.status)}
          </Badge>

          {order.status === "draft" && (
            <EditOrderDialog
              order={{
                id: order.id,
                order_number: order.order_number,
                revision: order.revision,
                delivery_date: order.delivery_date,
                note: order.note,
                customer_snapshot: order.customer_snapshot,
              }}
              defaultOpen={query.edit === "1"}
            />
          )}

          {order.order_items.length > 0 && (
            <Button variant="light" size="sm" asChild>
              <Link
                href={`/print/orders/${order.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5"
                data-test="print-order-details"
              >
                <Printer className="size-3.5" />
                <span>Print Specification</span>
              </Link>
            </Button>
          )}

          {account.role === "admin" && ["draft", "cancelled"].includes(order.status) && (
            <OrderDeleteDialog orderId={order.id} orderNumber={order.order_number} />
          )}
        </div>
      </PageHeader>

      {/* Grid for Customer and Order Metadata */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Customer Details */}
        <Card className="rounded-2xl border border-border bg-card shadow-xs">
          <CardHeader className="border-b border-border/60 p-6">
            <CardTitle className="text-title-2 font-bold text-brand-txt-primary">
              Customer Details
            </CardTitle>
            <CardDescription className="text-subtitle text-brand-txt-secondary">
              Contact and delivery destination
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <dl className="text-subtitle grid grid-cols-3 gap-y-3.5">
              <dt className="font-medium text-brand-txt-secondary">Name</dt>
              <dd className="col-span-2 font-semibold text-brand-txt-primary">
                {String(customer.name || "—")}
              </dd>

              <dt className="font-medium text-brand-txt-secondary">Phone</dt>
              <dd className="col-span-2 text-brand-txt-primary">{String(customer.phone || "—")}</dd>

              <dt className="font-medium text-brand-txt-secondary">Address</dt>
              <dd className="col-span-2 text-brand-txt-primary">
                {[customer.address, customer.city, customer.state, customer.zip_code]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </dd>
            </dl>
          </CardContent>
        </Card>

        {/* Order Status & Timeline */}
        <Card className="rounded-2xl border border-border bg-card shadow-xs">
          <CardHeader className="border-b border-border/60 p-6">
            <CardTitle className="text-title-2 font-bold text-brand-txt-primary">
              Order Workflow
            </CardTitle>
            <CardDescription className="text-subtitle text-brand-txt-secondary">
              Production status and scheduling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <OrderStatusForm
              orderId={order.id}
              currentStatus={order.status}
              revision={order.revision}
            />

            <dl className="text-subtitle grid grid-cols-3 gap-y-3.5 border-t border-border/60 pt-2">
              <dt className="font-medium text-brand-txt-secondary">Delivery</dt>
              <dd className="col-span-2 font-medium text-brand-txt-primary">
                {order.delivery_date ? formatDate(order.delivery_date) : "Not set"}
              </dd>

              <dt className="font-medium text-brand-txt-secondary">Note</dt>
              <dd className="col-span-2 text-brand-txt-secondary italic">
                {order.note || "No special instructions provided"}
              </dd>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Door Specification Items Card */}
      <Card className="rounded-2xl border border-border bg-card shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 p-6">
          <div className="space-y-0.5">
            <CardTitle className="text-title-2 font-bold text-brand-txt-primary">
              Door & Frame Specifications
            </CardTitle>
            <CardDescription className="text-subtitle text-brand-txt-secondary">
              {order.order_items.length}{" "}
              {order.order_items.length === 1 ? "door item" : "door items"} in this order
            </CardDescription>
          </div>
          {order.status === "draft" && (
            <Button variant="secondery" size="sm" asChild>
              <Link
                href={`/home/quotes/${order.id}/items/new`}
                className="flex items-center gap-1.5"
              >
                <Plus className="size-4" />
                <span>Add Door</span>
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-6">
          {order.order_items.length ? (
            <div className="divide-y divide-border/60">
              {order.order_items
                .toSorted((a, b) => a.line_number - b.line_number)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-body font-bold text-brand-txt-primary">
                          Door #{item.line_number}
                        </span>
                        <Badge variant="lime" className="text-xxs uppercase">
                          {item.system === "rehau" ? "Rehau Total70" : "Eurocell Composite"}
                        </Badge>
                      </div>
                      <p className="text-subtitle text-brand-txt-secondary">
                        {item.width_mm} × {item.height_mm} mm · Qty {item.quantity}
                        {item.location ? ` · Location: ${item.location}` : ""}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <OrderItemActions
                        orderId={order.id}
                        revision={order.revision}
                        item={item}
                        editable={order.status === "draft"}
                      />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Typography variant="h3" className="text-title-2 font-bold text-brand-txt-primary">
                No doors configured yet
              </Typography>
              <Typography className="text-body mt-1 mb-5 max-w-sm text-brand-txt-secondary">
                Select a Eurocell or Rehau frame style, enter the dimensions and customize your
                specification.
              </Typography>
              {order.status === "draft" && (
                <Button variant="secondery" size="sm" asChild>
                  <Link href={`/home/quotes/${order.id}/items/new`}>Choose Door Style</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
