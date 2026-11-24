import Link from "next/link";

import { OrderIntakeForm } from "@/components/portal/order-intake-form";
import { Card, PageHead, portalStyles as s } from "@/components/portal/ui";

export const metadata = { title: "New order" };

export default function NewOrderPage() {
  return (
    <>
      <PageHead
        title="New order"
        note="Add the customer details first. Door style and specification follow next."
      />
      <div className={s.stack}>
        <Link href="/home/quotes" className={s.link}>
          ← Quotes
        </Link>
        <Card
          title="Customer and delivery"
          note="The order date is recorded automatically when this draft is created."
        >
          <OrderIntakeForm />
        </Card>
      </div>
    </>
  );
}
