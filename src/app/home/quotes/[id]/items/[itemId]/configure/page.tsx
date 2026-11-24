import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { OrderItemConfigurator } from "@/components/portal/order-item-configurator";
import { Badge, PageHead, portalStyles as s } from "@/components/portal/ui";
import { getOrder } from "@/server/orders/data";
import { ConfigurationSchema } from "@/server/portal/schemas";

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
  const parsedConfiguration = ConfigurationSchema.safeParse(item.configuration);
  const initialConfiguration = parsedConfiguration.success
    ? {
        ...parsedConfiguration.data,
        system: (item.system === "rehau" ? "rehau" : "eurocell") as "eurocell" | "rehau",
        frame: {
          width_mm: item.width_mm,
          height_mm: item.height_mm,
          quantity: item.quantity,
          location: item.location,
        },
      }
    : ConfigurationSchema.parse({
        system: item.system === "rehau" ? "rehau" : "eurocell",
        frame: {
          width_mm: item.width_mm,
          height_mm: item.height_mm,
          quantity: item.quantity,
          location: item.location,
        },
      });

  return (
    <>
      <PageHead
        title="Door questions"
        note={`${order.order_number} · ${item.width_mm}w × ${item.height_mm}h · Quantity ${item.quantity}`}
      >
        <Badge state="active">
          {item.system === "rehau" ? "Rehau Total70" : "Eurocell Composite"}
        </Badge>
      </PageHead>
      <Link href={`/home/quotes/${order.id}`} className={s.link}>
        ← Order summary
      </Link>
      <OrderItemConfigurator
        orderId={order.id}
        itemId={item.id}
        layoutId={item.layout_id}
        system={item.system === "rehau" ? "rehau" : "eurocell"}
        revision={order.revision}
        initialConfiguration={initialConfiguration}
        initialDrawings={{
          outside: item.outside_drawing || "",
          inside: item.inside_drawing || "",
        }}
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
