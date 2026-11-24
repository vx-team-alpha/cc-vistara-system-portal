import { ArrowUpRight01Icon, Door01Icon, Mail01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { PlusCircle, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/portal/icon";
import { OrderTable } from "@/components/portal/order-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { getOrderStats, getRecentOrders } from "@/server/orders/data";

export default async function HomePage() {
  const [stats, orders] = await Promise.all([getOrderStats(), getRecentOrders()]);

  const metrics = [
    {
      label: "Draft orders",
      value: stats.draft,
      note: `${stats.issued} issued`,
      icon: Mail01Icon,
      accentBg: "bg-brand-accent3",
      accentText: "text-brand-txt-primary",
    },
    {
      label: "Confirmed",
      value: stats.confirmed,
      note: "Ready for production",
      icon: ViewIcon,
      accentBg: "bg-brand-accent6",
      accentText: "text-brand-accent1",
    },
    {
      label: "In production",
      value: stats.production,
      note: "Active works orders",
      icon: Door01Icon,
      accentBg: "bg-brand-accent1",
      accentText: "text-brand-accent2",
    },
    {
      label: "Due soon",
      value: stats.dueSoon,
      note: stats.overdue ? `${stats.overdue} overdue` : "Next seven days",
      icon: ArrowUpRight01Icon,
      accentBg: "bg-brand-accent4/10",
      accentText: "text-brand-accent4",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Overview"
        subtitle="Current quotes, confirmed work and upcoming deliveries."
      >
        <Button variant="primary" size="md" asChild>
          <Link href="/home/quotes/new" className="flex items-center gap-2">
            <PlusCircle className="size-4" />
            <span>New order</span>
          </Link>
        </Button>
      </PageHeader>

      {/* Hero Welcome Banner in Ladder App Style */}
      <div className="bg-gradient-green relative overflow-hidden rounded-2xl p-6 text-white shadow-xs sm:p-8">
        <div className="max-w-2xl space-y-2">
          <Typography className="text-h2 font-bold tracking-tight text-white">
            Vistara Window & Door Platform
          </Typography>
          <Typography className="text-body text-white/80">
            Configure bespoke Eurocell windows and composite doors, generate instant customer
            pricing, and manage your manufacturing workflow.
          </Typography>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="secondery" size="sm" asChild>
              <Link href="/home/quotes/new">Start Door Specification</Link>
            </Button>
            <Button
              variant="transparent"
              size="sm"
              asChild
              className="text-white hover:bg-white/10"
            >
              <Link href="/home/quotes">Browse All Orders</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics Section */}
      <div className="space-y-4">
        <Typography variant="h3" className="text-h3 font-bold text-brand-txt-primary">
          Key Metrics
        </Typography>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-brand-accent1/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-subtitle font-medium text-brand-txt-secondary">
                  {metric.label}
                </span>
                <div
                  className={`flex size-8 items-center justify-center rounded-lg ${metric.accentBg} ${metric.accentText}`}
                >
                  <Icon icon={metric.icon} size={16} />
                </div>
              </div>

              <div className="mt-3">
                <p className="text-lg-input font-bold tracking-tight text-brand-txt-primary">
                  {metric.value.toLocaleString()}
                </p>
                <div className="text-caption mt-1 flex items-center gap-1.5 text-brand-txt-secondary">
                  <ArrowUpRight className="size-3.5 text-emerald-600" />
                  <span>{metric.note}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders Section */}
      <Card className="rounded-2xl border border-border bg-card shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 px-6 py-5">
          <div className="space-y-1">
            <CardTitle className="text-title-2 font-bold text-brand-txt-primary">
              Recent orders
            </CardTitle>
            <CardDescription className="text-subtitle text-brand-txt-secondary">
              Resume a draft or open the latest customer specification.
            </CardDescription>
          </div>
          <Button variant="link" size="sm" asChild className="font-medium text-brand-accent5">
            <Link href="/home/quotes">View all quotes &rarr;</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <OrderTable orders={orders} />
        </CardContent>
      </Card>
    </div>
  );
}
