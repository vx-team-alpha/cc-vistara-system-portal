import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { OrderEditForm } from "@/components/portal/order-edit-form";
import { Badge, Card, PageHead, portalStyles as s } from "@/components/portal/ui";
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
    <>
      <PageHead
        title="Edit order"
        note={`${order.order_number} · Draft details and customer snapshot`}
      >
        <Badge state="draft">Draft only</Badge>
      </PageHead>
      <div className={s.stack}>
        <Link href={`/home/quotes/${order.id}`} className={s.link}>
          ← Order summary
        </Link>
        <Card
          title="Order and customer details"
          note="These changes apply to this order unless you explicitly update the customer profile."
        >
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
        </Card>
      </div>
    </>
  );
}
