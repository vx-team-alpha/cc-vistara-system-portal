import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { OrderDeleteDialog } from "@/components/portal/order-delete-dialog";
import { OrderItemActions } from "@/components/portal/order-item-actions";
import { OrderStatusForm } from "@/components/portal/order-status-form";
import {
  Badge,
  Card,
  formatDate,
  formatStatus,
  PageHead,
  portalStyles as s,
} from "@/components/portal/ui";
import { getCurrentAccount } from "@/server/auth-wrapper";
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
  const [order, account] = await Promise.all([getOrder(id), getCurrentAccount()]);
  if (!order) notFound();
  const customer = snapshot(order.customer_snapshot);

  return (
    <>
      <PageHead
        title={order.order_number}
        note={`Created ${formatDate(order.created_at)}${order.delivery_date ? ` · Delivery ${formatDate(order.delivery_date)}` : ""}`}
      >
        <div className={s.pageActions}>
          {order.status === "draft" && (
            <Link className={s.btn} href={`/home/quotes/${order.id}/edit`} data-test="edit-order">
              Edit order
            </Link>
          )}
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
          {account.role === "admin" && ["draft", "cancelled"].includes(order.status) && (
            <OrderDeleteDialog orderId={order.id} orderNumber={order.order_number} />
          )}
          <Badge state={order.status}>{formatStatus(order.status)}</Badge>
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
            <OrderStatusForm
              orderId={order.id}
              currentStatus={order.status}
              revision={order.revision}
            />
            <dl className={s.spec}>
              <dt>Delivery</dt>
              <dd>{order.delivery_date ? formatDate(order.delivery_date) : "Not set"}</dd>
              <dt>Note</dt>
              <dd>{order.note || "No note"}</dd>
            </dl>
          </Card>
        </div>
        <Card
          title="Door items"
          note={`${order.order_items.length} ${order.order_items.length === 1 ? "door" : "doors"}`}
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
              {order.order_items
                .toSorted((a, b) => a.line_number - b.line_number)
                .map((item) => (
                  <div className={s.row} key={item.id}>
                    <div>
                      <div className={s.rowTitle}>
                        <strong>Door {item.line_number}</strong>
                        <Badge state="active">
                          {item.system === "rehau" ? "Rehau Total70" : "Eurocell Composite"}
                        </Badge>
                      </div>
                      <small>
                        {item.width_mm} × {item.height_mm} mm · Qty {item.quantity}
                        {item.location ? ` · ${item.location}` : ""}
                      </small>
                    </div>
                    <div className={s.rowActions}>
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
            <div className={s.empty}>
              <h3>Choose the first door</h3>
              <p>Select a style, enter the frame details and complete the door specification.</p>
              {order.status === "draft" && (
                <Link
                  className={`${s.btn} ${s.btnPrimary}`}
                  href={`/home/quotes/${order.id}/items/new`}
                >
                  Choose door style
                </Link>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
