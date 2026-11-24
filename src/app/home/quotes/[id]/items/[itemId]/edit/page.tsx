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
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 gap-1.5 text-brand-txt-secondary hover:text-brand-txt-primary"
        >
          <Link href={`/home/quotes/${order.id}`}>
            <ArrowLeft className="size-4" />
            <span>Back to Order Summary</span>
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Edit Door #${item.line_number}`}
        subtitle={`${order.order_number} · Update frame dimensions, system profile, or choose a different door style.`}
      >
        <Badge variant="secondary" className="px-3 py-1 text-xs">
          Draft Only
        </Badge>
      </PageHeader>

      {choosingLayout ? (
        <Card className="rounded-2xl border border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 px-6 py-4.5">
            <div className="space-y-0.5">
              <CardTitle className="text-title-2 font-bold text-brand-txt-primary">
                Choose Replacement Door Style
              </CardTitle>
              <CardDescription className="text-subtitle text-brand-txt-secondary">
                Changing the style resets incompatible configuration answers and drawings.
              </CardDescription>
            </div>
            {selected && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/home/quotes/${order.id}/items/${item.id}/edit`}>
                  Cancel Style Change
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {catalogue.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/home/quotes/${order.id}/items/${item.id}/edit?layout=${product.id}`}
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
      ) : (
        <Card className="rounded-2xl border border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 px-6 py-4.5">
            <div className="space-y-0.5">
              <CardTitle className="text-title-2 font-bold text-brand-txt-primary">
                {selected.name}
              </CardTitle>
              <CardDescription className="text-subtitle text-brand-txt-secondary">
                Saved answers are preserved unless the style changes.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/home/quotes/${order.id}/items/${item.id}/edit?change=1`}>
                Change Door Style
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
              <div className="flex flex-col items-center justify-center">
                <div className="flex h-[280px] max-h-[280px] w-full items-center justify-center overflow-hidden [&_svg]:mx-auto [&_svg]:h-full [&_svg]:max-h-[280px] [&_svg]:w-auto [&_svg]:max-w-full">
                  <LayoutPreview src={selected.image} />
                </div>
                <span className="text-subtitle mt-3 font-bold text-brand-txt-primary">
                  {selected.name}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <Typography
                    variant="h3"
                    className="text-title-2 font-bold text-brand-txt-primary"
                  >
                    Update Frame Details
                  </Typography>
                  <Typography className="text-subtitle text-brand-txt-secondary">
                    Measurements, location, and manufacturing profile.
                  </Typography>
                </div>

                <OrderItemFrameForm
                  orderId={order.id}
                  layoutId={selected.id}
                  revision={order.revision}
                  item={item}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
