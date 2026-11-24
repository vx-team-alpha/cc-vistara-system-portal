import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { LayoutPreview } from "@/components/portal/layout-preview";
import { OrderItemFrameForm } from "@/components/portal/order-item-frame-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
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
    <div className="space-y-6">
      {/* Back button */}
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
        title="Choose Door Style"
        subtitle={`${order.order_number} · Select the structural layout before entering frame measurements.`}
      >
        <Badge variant="lime" className="px-3 py-1 text-xs">
          Eurocell & Rehau Compatible
        </Badge>
      </PageHeader>

      {selected ? (
        <Card className="rounded-2xl border border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 p-6">
            <div className="space-y-0.5">
              <CardTitle className="text-title-2 font-bold text-brand-txt-primary">
                {selected.name}
              </CardTitle>
              <CardDescription className="text-subtitle text-brand-txt-secondary">
                Configure either Eurocell Composite or Rehau Total70 for this door frame.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/home/quotes/${order.id}/items/new`}>Change Style</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
              <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-brand-backgroundSecondary p-6">
                <LayoutPreview src={selected.image} />
                <span className="text-subtitle mt-4 font-bold text-brand-txt-primary">
                  {selected.name}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <Typography
                    variant="h3"
                    className="text-title-2 font-bold text-brand-txt-primary"
                  >
                    Frame Measurements
                  </Typography>
                  <Typography className="text-subtitle text-brand-txt-secondary">
                    Enter the supplied dimensions and installation location.
                  </Typography>
                </div>

                <OrderItemFrameForm
                  orderId={order.id}
                  layoutId={selected.id}
                  revision={order.revision}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border border-border bg-card shadow-xs">
          <CardHeader className="border-b border-border/60 p-6">
            <CardTitle className="text-title-2 font-bold text-brand-txt-primary">
              Door Styles Library
            </CardTitle>
            <CardDescription className="text-subtitle text-brand-txt-secondary">
              Select a frame profile to start configuring specifications and accessories.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {catalogue.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/home/quotes/${order.id}/items/new?layout=${product.id}`}
                  className="group flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center shadow-xs transition-all hover:border-brand-accent1 hover:bg-brand-backgroundSecondary/50"
                >
                  <div className="mb-3 flex size-32 items-center justify-center p-2">
                    <LayoutPreview src={product.image} />
                  </div>
                  <span className="text-subtitle font-semibold text-brand-txt-primary transition-colors group-hover:text-brand-accent1">
                    {product.name}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
