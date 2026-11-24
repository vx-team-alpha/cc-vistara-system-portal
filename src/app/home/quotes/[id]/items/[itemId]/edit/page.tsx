import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { LayoutPreview } from "@/components/portal/layout-preview";
import { OrderItemFrameForm } from "@/components/portal/order-item-frame-form";
import { Badge, Card, PageHead, portalStyles as s } from "@/components/portal/ui";
import { loadDoorCatalogue } from "@/server/catalogue/data";
import { getOrder } from "@/server/orders/data";

export const metadata = { title: "Edit door" };

export default async function EditOrderItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; itemId: string }>;
  searchParams: Promise<{ layout?: string; change?: string }>;
}) {
  const [{ id, itemId }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(itemId).success) notFound();

  const [order, catalogue] = await Promise.all([getOrder(id), loadDoorCatalogue()]);
  const item = order?.order_items.find((candidate) => candidate.id === itemId);
  if (!order || order.status !== "draft" || !item) notFound();

  const selectedLayoutId = query.layout || item.layout_id;
  const selected = catalogue.products.find((product) => product.id === selectedLayoutId);
  const choosingLayout = query.change === "1" || !selected;

  return (
    <>
      <PageHead
        title={`Edit Door ${item.line_number}`}
        note={`${order.order_number} · Update the frame first, then review the saved configuration.`}
      >
        <Badge state="draft">Draft only</Badge>
      </PageHead>
      <div className={s.stack}>
        <Link href={`/home/quotes/${order.id}`} className={s.link}>
          ← Order summary
        </Link>
        {choosingLayout ? (
          <Card
            title="Choose a replacement door style"
            note="Changing style resets incompatible configuration answers and drawings after confirmation."
            flush
          >
            <div className={s.styleLibrary}>
              {catalogue.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/home/quotes/${order.id}/items/${item.id}/edit?layout=${product.id}`}
                  className={s.styleCard}
                >
                  <span className={s.stylePreview}>
                    <LayoutPreview src={product.image} />
                  </span>
                  <span className={s.styleName}>{product.name}</span>
                </Link>
              ))}
            </div>
          </Card>
        ) : (
          <Card title={selected.name} note="Saved answers are preserved unless the style changes.">
            <div className={s.selectedStyle}>
              <div className={s.selectedStylePreview}>
                <LayoutPreview src={selected.image} />
              </div>
              <div className={s.stack}>
                <Badge state="active">
                  {item.system === "rehau" ? "Rehau Total70" : "Eurocell Composite"}
                </Badge>
                <div>
                  <h3 className={s.stepTitle}>Frame details</h3>
                  <p className={s.cardNote}>Review measurements, quantity, and location.</p>
                </div>
                <OrderItemFrameForm
                  orderId={order.id}
                  layoutId={selected.id}
                  revision={order.revision}
                  item={item}
                />
                <Link
                  className={s.link}
                  href={`/home/quotes/${order.id}/items/${item.id}/edit?change=1`}
                >
                  Change door style
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
