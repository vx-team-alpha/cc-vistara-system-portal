import Link from "next/link";

import type { Json } from "@/types/supabase";

import { Badge, Empty, formatDate, formatStatus } from "./ui";

import s from "./portal.module.css";

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

export function OrderTable({ orders }: { orders: OrderRow[] }) {
  if (!orders.length) {
    return (
      <Empty
        title="No orders yet"
        action={
          <Link className={`${s.btn} ${s.btnPrimary}`} href="/home/quotes/new">
            Create the first order
          </Link>
        }
      >
        Start with the customer details, then configure one or more Eurocell doors.
      </Empty>
    );
  }

  return (
    <div className={s.tableScroll}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Status</th>
            <th>Delivery</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const contact = customer(order.customer_snapshot);
            const quantity = order.order_items.reduce((total, item) => total + item.quantity, 0);
            return (
              <tr key={order.id} className={s.clickableRow}>
                <td>
                  <Link className={s.stretchedRowLink} href={`/home/quotes/${order.id}`}>
                    {order.order_number}
                    <span className={s.srOnly}> for {contact.name}</span>
                  </Link>
                </td>
                <td>
                  <span className={s.cellTitle}>{contact.name}</span>
                  <small>{contact.phone}</small>
                </td>
                <td>{quantity || "—"}</td>
                <td>
                  <Badge state={order.status}>{formatStatus(order.status)}</Badge>
                </td>
                <td>{order.delivery_date ? formatDate(order.delivery_date) : "Not set"}</td>
                <td>{formatDate(order.updated_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
