import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { OrderItemConfigurator } from "@/components/portal/order-item-configurator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
            <span>Back to Order {order.order_number}</span>
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Configure Door #${item.line_number}`}
        subtitle={`${order.order_number} · ${item.width_mm}mm × ${item.height_mm}mm · Qty ${item.quantity}`}
      >
        <Badge variant="lime" className="px-3 py-1 text-xs">
          {item.system === "rehau" ? "Rehau Total70" : "Eurocell Composite"}
        </Badge>
      </PageHeader>

      <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs">
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
      </div>
    </div>
  );
}
