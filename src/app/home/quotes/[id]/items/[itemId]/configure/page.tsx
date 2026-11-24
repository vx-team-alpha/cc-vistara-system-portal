import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { OrderItemConfigurator } from "@/components/portal/order-item-configurator";
import { Badge, PageHead, portalStyles as s } from "@/components/portal/ui";
import { getOrder } from "@/server/orders/data";

export const metadata = { title: "Configure door" };

export default async function ConfigureOrderItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(itemId).success) notFound();
  const order = await getOrder(id);
  const item = order?.order_items.find((candidate) => candidate.id === itemId);
  if (!order || order.status !== "draft" || !item?.layout_id) notFound();

  return (
    <>
      <PageHead
        title="Door questions"
        note={`${order.order_number} · ${item.width_mm}w × ${item.height_mm}h · Quantity ${item.quantity}`}
      >
        <Badge state="active">Eurocell Composite</Badge>
      </PageHead>
      <Link href={`/home/quotes/${order.id}`} className={s.link}>
        ← Order summary
      </Link>
      <OrderItemConfigurator
        orderId={order.id}
        itemId={item.id}
        layoutId={item.layout_id}
        frameDetails={{
          width_mm: item.width_mm,
          height_mm: item.height_mm,
          quantity: item.quantity,
          location: item.location,
        }}
      />
    </>
  );
}
