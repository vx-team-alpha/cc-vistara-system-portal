import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Badge, Card, formatDate, PageHead, portalStyles as s } from "@/components/portal/ui";
import { getOrder } from "@/server/orders/data";
import type { Json } from "@/types/supabase";

export const metadata = { title: "Order details" };

function snapshot(value: Json) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const order = await getOrder(id);
  if (!order) notFound();
  const customer = snapshot(order.customer_snapshot);

  return (
    <>
      <PageHead
        title={order.order_number}
        note={`Created ${formatDate(order.created_at)}${order.delivery_date ? ` · Delivery ${formatDate(order.delivery_date)}` : ""}`}
      >
        <div className={s.pageActions}>
          {order.order_items.length > 0 && (
            <Link
              className={s.btn}
              href={`/print/orders/${order.id}`}
              target="_blank"
              rel="noreferrer"
              data-test="print-order-details"
            >
              Print details
            </Link>
          )}
          <Badge state={order.status}>{order.status.replace("_", " ")}</Badge>
        </div>
      </PageHead>
      <div className={s.stack}>
        <Link href="/home/quotes" className={s.link}>
          ← Quotes
        </Link>
        <div className={s.grid2}>
          <Card title="Customer">
            <dl className={s.spec}>
              <dt>Name</dt>
              <dd>{String(customer.name || "—")}</dd>
              <dt>Phone</dt>
              <dd>{String(customer.phone || "—")}</dd>
              <dt>Address</dt>
              <dd>
                {String(customer.address || "—")}, {String(customer.city || "")}{" "}
                {String(customer.state || "")} {String(customer.zip_code || "")}
              </dd>
            </dl>
          </Card>
          <Card title="Order">
            <dl className={s.spec}>
              <dt>Status</dt>
              <dd>{order.status.replace("_", " ")}</dd>
              <dt>Delivery</dt>
              <dd>{order.delivery_date ? formatDate(order.delivery_date) : "Not set"}</dd>
              <dt>Note</dt>
              <dd>{order.note || "No note"}</dd>
            </dl>
          </Card>
        </div>
        <Card
          title="Door items"
          note={`${order.order_items.length} configured ${order.order_items.length === 1 ? "item" : "items"}`}
          actions={
            order.status === "draft" ? (
              <Link
                className={`${s.btn} ${s.btnPrimary}`}
                href={`/home/quotes/${order.id}/items/new`}
              >
                Add door
              </Link>
            ) : null
          }
          flush
        >
          {order.order_items.length ? (
            <div className={s.cardBody}>
              {order.order_items.map((item) => (
                <div className={s.row} key={item.id}>
                  <div>
                    <strong>Door {item.line_number}</strong>
                    <small>
                      {item.width_mm} × {item.height_mm} mm · Qty {item.quantity}
                      {item.location ? ` · ${item.location}` : ""}
                    </small>
                  </div>
                  <Badge state="active">Eurocell</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className={s.empty}>
              <h3>Choose the first door</h3>
              <p>Select a style, enter the frame details and complete the door specification.</p>
              <Link
                className={`${s.btn} ${s.btnPrimary}`}
                href={`/home/quotes/${order.id}/items/new`}
              >
                Choose door style
              </Link>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
