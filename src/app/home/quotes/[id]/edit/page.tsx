import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { OrderEditForm } from "@/components/portal/order-edit-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrder } from "@/server/orders/data";
import type { Json } from "@/types/supabase";

export const metadata = { title: "Edit order" };

function snapshot(value: Json) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const order = await getOrder(id);
  if (!order || order.status !== "draft") notFound();
  const customer = snapshot(order.customer_snapshot);

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 gap-1.5 text-brand-txt-secondary hover:text-brand-txt-primary"
        >
          <Link href={`/home/quotes/${order.id}`}>
            <ArrowLeft className="size-4" />
            <span>Back to Order Summary</span>
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Edit Order ${order.order_number}`}
        subtitle="Modify customer contact details and requested delivery schedule."
      >
        <Badge variant="secondary" className="px-3 py-1 text-xs">
          Draft Only
        </Badge>
      </PageHeader>

      <Card className="max-w-3xl rounded-2xl border border-border bg-card shadow-xs">
        <CardHeader className="border-b border-border/60 px-6 py-4.5">
          <CardTitle className="text-title-2 font-bold text-brand-txt-primary">
            Order & Customer Details
          </CardTitle>
          <CardDescription className="text-subtitle text-brand-txt-secondary">
            Changes will update this draft without altering previous finalized records.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <OrderEditForm
            initialValues={{
              order_id: order.id,
              revision: order.revision,
              customer_name: String(customer.name || ""),
              phone: String(customer.phone || ""),
              address: String(customer.address || ""),
              city: String(customer.city || ""),
              state: String(customer.state || ""),
              zip_code: String(customer.zip_code || ""),
              delivery_date: order.delivery_date || "",
              note: order.note,
              update_customer_profile: false,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
