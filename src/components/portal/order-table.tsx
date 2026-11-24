import type { VariantProps } from "class-variance-authority";
import { ArrowRight, FileText } from "lucide-react";
import Link from "next/link";

import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";
import type { Json } from "@/types/supabase";

import { formatDate, formatStatus } from "./ui";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  delivery_date: string | null;
  updated_at: string;
  customer_snapshot: Json;
  order_items: { quantity: number; location?: string }[];
};

function customer(snapshot: Json) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { name: "Customer", phone: "No phone" };
  }
  return {
    name: typeof snapshot.name === "string" ? snapshot.name : "Customer",
    phone: typeof snapshot.phone === "string" ? snapshot.phone : "No phone",
  };
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

export function OrderTable({ orders }: { orders: OrderRow[] }) {
  if (!orders.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-accent3 text-brand-txt-secondary">
          <FileText className="size-6" />
        </div>
        <Typography variant="h3" className="text-title-2 font-bold text-brand-txt-primary">
          No orders yet
        </Typography>
        <Typography className="text-body mt-1 max-w-sm text-brand-txt-secondary">
          Start by creating your first order with customer details, then configure bespoke Eurocell
          frames.
        </Typography>
        <div className="mt-6">
          <Button variant="primary" size="sm" asChild>
            <Link href="/home/quotes/new">Create the first order</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/80 bg-brand-backgroundSecondary/50 hover:bg-transparent">
            <TableHead className="py-3.5 pl-6 text-xs font-semibold tracking-wider text-brand-txt-secondary uppercase">
              Order
            </TableHead>
            <TableHead className="py-3.5 text-xs font-semibold tracking-wider text-brand-txt-secondary uppercase">
              Customer
            </TableHead>
            <TableHead className="py-3.5 text-xs font-semibold tracking-wider text-brand-txt-secondary uppercase">
              Items
            </TableHead>
            <TableHead className="py-3.5 text-xs font-semibold tracking-wider text-brand-txt-secondary uppercase">
              Status
            </TableHead>
            <TableHead className="py-3.5 text-xs font-semibold tracking-wider text-brand-txt-secondary uppercase">
              Delivery
            </TableHead>
            <TableHead className="py-3.5 text-xs font-semibold tracking-wider text-brand-txt-secondary uppercase">
              Updated
            </TableHead>
            <TableHead className="py-3.5 pr-6 text-right text-xs font-semibold tracking-wider text-brand-txt-secondary uppercase">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const contact = customer(order.customer_snapshot);
            const quantity = order.order_items.reduce((total, item) => total + item.quantity, 0);
            const badgeVariant = getStatusBadgeVariant(order.status);

            return (
              <TableRow
                key={order.id}
                className="group border-b border-border/60 transition-colors hover:bg-brand-backgroundMain/40"
              >
                <TableCell className="py-4 pl-6 font-semibold">
                  <Link
                    href={`/home/quotes/${order.id}`}
                    className="flex items-center gap-2 text-brand-txt-primary transition-colors group-hover:text-brand-accent5"
                  >
                    <span>{order.order_number}</span>
                  </Link>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="text-body font-medium text-brand-txt-primary">
                      {contact.name}
                    </span>
                    <span className="text-caption text-brand-txt-secondary">{contact.phone}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <span className="text-subtitle font-medium text-brand-txt-primary">
                    {quantity || "—"}
                  </span>
                </TableCell>
                <TableCell className="py-4">
                  <Badge variant={badgeVariant}>{formatStatus(order.status)}</Badge>
                </TableCell>
                <TableCell className="text-subtitle py-4 text-brand-txt-secondary">
                  {order.delivery_date ? formatDate(order.delivery_date) : "Not set"}
                </TableCell>
                <TableCell className="text-subtitle py-4 text-brand-txt-secondary">
                  {formatDate(order.updated_at)}
                </TableCell>
                <TableCell className="py-4 pr-6 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 px-2.5 text-brand-txt-secondary hover:bg-brand-accent3 hover:text-brand-txt-primary"
                  >
                    <Link
                      href={`/home/quotes/${order.id}`}
                      className="text-caption inline-flex items-center gap-1 font-semibold"
                    >
                      <span>View</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
