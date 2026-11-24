import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { NewOrderDialog } from "@/components/portal/new-order-dialog";
import { OrderTable } from "@/components/portal/order-table";
import { Button } from "@/components/ui/button";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { Separator } from "@/components/ui/separator";
import { Typography } from "@/components/ui/typography";
import { getOrderStats, getRecentOrders } from "@/server/orders/data";

export default async function HomePage() {
  const [stats, orders] = await Promise.all([getOrderStats(), getRecentOrders()]);

  const keyMetrics = [
    { title: "Draft orders", value: stats.draft.toString(), trend: "up" as const },
    { title: "Confirmed", value: stats.confirmed.toString() },
    { title: "In production", value: stats.production.toString() },
    { title: "Due soon", value: stats.dueSoon.toString(), trend: "up" as const },
  ];

  return (
    <div className="mx-auto w-full space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Overview"
        subtitle="Current quotes, confirmed work and upcoming deliveries."
      >
        <NewOrderDialog />
      </PageHeader>

      <Separator className="bg-brand-backgroundMain" />

      {/* Key Metrics Section */}
      <div className="space-y-4">
        <Typography variant="h3" className="text-h3 font-bold text-brand-txt-primary">
          Key Metrics
        </Typography>

        <div className="grid grid-cols-2 gap-6 py-2 sm:grid-cols-4 lg:grid-cols-4">
          {keyMetrics.map((metric) => (
            <div key={metric.title} className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-subtitle text-brand-txt-secondary">{metric.title}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-lg-input font-bold tracking-tight text-brand-txt-primary">
                    {metric.value}
                  </p>
                  {metric.trend === "up" && (
                    <span className="text-success">
                      <svg
                        width="25"
                        height="24"
                        viewBox="0 0 25 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M15.6 6C15.0477 6 14.6 6.44772 14.6 7C14.6 7.55228 15.0477 8 15.6 8H20.1858L14.0242 14.1615C13.8146 14.3712 13.6993 14.4854 13.6101 14.5611L13.6 14.5696L13.5898 14.5611C13.5007 14.4854 13.3854 14.3712 13.1757 14.1615L10.4159 11.4017C10.2375 11.2232 10.0637 11.0494 9.90446 10.9142C9.72962 10.7658 9.50773 10.6062 9.21801 10.5121C8.81632 10.3816 8.38363 10.3816 7.98194 10.5121C7.69222 10.6062 7.47033 10.7658 7.29549 10.9142C7.13627 11.0494 6.9625 11.2232 6.78406 11.4017L1.89287 16.2929C1.50234 16.6834 1.50234 17.3166 1.89287 17.7071C2.28339 18.0976 2.91656 18.0976 3.30708 17.7071L8.17571 12.8385C8.38539 12.6288 8.50067 12.5146 8.58984 12.4389L8.59998 12.4304L8.61011 12.4389C8.69928 12.5146 8.81456 12.6288 9.02424 12.8385L11.7841 15.5983C11.9625 15.7768 12.1363 15.9506 12.2955 16.0858C12.4703 16.2342 12.6922 16.3938 12.9819 16.4879C13.3836 16.6184 13.8163 16.6184 14.218 16.4879C14.5077 16.3938 14.7296 16.2342 14.9045 16.0858C15.0637 15.9506 15.2375 15.7768 15.4159 15.5983L21.6 9.41421V14C21.6 14.5523 22.0477 15 22.6 15C23.1523 15 23.6 14.5523 23.6 14V7C23.6 6.44772 23.1523 6 22.6 6H15.6Z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-brand-backgroundMain" />

      {/* Recent Orders Section */}
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between">
            <Typography variant="h3" className="relative flex items-center gap-2">
              <LiveIndicator />
              Recent orders
            </Typography>
            <Button asChild variant="transparent" size="sm" className="text-brand-accent5">
              <Link href="/home/quotes">See all</Link>
            </Button>
          </div>
          <Typography className="text-subtitle text-brand-txt-secondary">
            Resume a draft or open the latest customer specification.
          </Typography>
        </div>

        <OrderTable orders={orders} />
      </div>
    </div>
  );
}
