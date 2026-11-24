import { ArrowUpRight01Icon, Door01Icon, Mail01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { Icon } from "@/components/portal/icon";
import { OrderTable } from "@/components/portal/order-table";
import { Card, PageHead, portalStyles as s } from "@/components/portal/ui";
import { getOrderStats, getRecentOrders } from "@/server/orders/data";

export default async function HomePage() {
  const [stats, orders] = await Promise.all([getOrderStats(), getRecentOrders()]);
  const metrics = [
    { label: "Draft orders", value: stats.draft, note: `${stats.issued} issued`, icon: Mail01Icon },
    { label: "Confirmed", value: stats.confirmed, note: "Ready for production", icon: ViewIcon },
    {
      label: "In production",
      value: stats.production,
      note: "Active works orders",
      icon: Door01Icon,
    },
    {
      label: "Due soon",
      value: stats.dueSoon,
      note: stats.overdue ? `${stats.overdue} overdue` : "Next seven days",
      icon: ArrowUpRight01Icon,
    },
  ];

  return (
    <>
      <PageHead title="Overview" note="Current quotes, confirmed work and upcoming deliveries.">
        <Link href="/home/quotes/new" className={`${s.btn} ${s.btnPrimary}`}>
          New order
        </Link>
      </PageHead>
      <div className={s.stats}>
        {metrics.map((metric) => (
          <section className={s.stat} key={metric.label}>
            <h2 className={s.statLabel}>
              <Icon icon={metric.icon} />
              {metric.label}
            </h2>
            <p className={s.statValue}>{metric.value.toLocaleString()}</p>
            <small>{metric.note}</small>
          </section>
        ))}
      </div>
      <Card
        title="Recent orders"
        note="Resume a draft or open the latest customer specification."
        actions={
          <Link href="/home/quotes" className={s.link}>
            View all quotes
          </Link>
        }
        flush
      >
        <OrderTable orders={orders} />
      </Card>
    </>
  );
}
