import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { LayoutPreview } from "@/components/portal/layout-preview";
import { OrderItemFrameForm } from "@/components/portal/order-item-frame-form";
import { Badge, Card, PageHead, portalStyles as s } from "@/components/portal/ui";
import { loadDoorCatalogue } from "@/server/catalogue/data";
import { getOrder } from "@/server/orders/data";

export const metadata = { title: "Choose door style" };

export default async function NewOrderItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ layout?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const [order, catalogue] = await Promise.all([getOrder(id), loadDoorCatalogue()]);
  if (!order || order.status !== "draft") notFound();
  const selected = catalogue.products.find((product) => product.id === query.layout);

  return (
    <>
      <PageHead
        title="Choose door style"
        note={`${order.order_number} · Select the structural layout before frame details.`}
      >
        <Badge state="active">Eurocell & Rehau</Badge>
      </PageHead>
      <div className={s.stack}>
        <Link href={`/home/quotes/${order.id}`} className={s.link}>
          ← Order summary
        </Link>
        {selected ? (
          <Card
            title={selected.name}
            note="Choose either Eurocell Composite or Rehau Total70 for your door frame."
          >
            <div className={s.selectedStyle}>
              <div className={s.selectedStylePreview}>
                <LayoutPreview src={selected.image} />
              </div>
              <div className={s.stack}>
                <div>
                  <h3 className={s.stepTitle}>Frame details</h3>
                  <p className={s.cardNote}>Enter the measurements supplied for this customer.</p>
                </div>
                <OrderItemFrameForm
                  orderId={order.id}
                  layoutId={selected.id}
                  revision={order.revision}
                />
                <Link className={s.link} href={`/home/quotes/${order.id}/items/new`}>
                  ← Change door style
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <Card
            title="Door styles"
            note="Original and GRiPCORE ranges are combined into one library."
            flush
          >
            <div className={s.styleLibrary}>
              {catalogue.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/home/quotes/${order.id}/items/new?layout=${product.id}`}
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
        )}
      </div>
    </>
  );
}
