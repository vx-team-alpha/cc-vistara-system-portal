import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { OrderIntakeForm } from "@/components/portal/order-intake-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "New order" };

export default function NewOrderPage() {
  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 gap-1.5 text-brand-txt-secondary hover:text-brand-txt-primary"
        >
          <Link href="/home/quotes">
            <ArrowLeft className="size-4" />
            <span>Back to Quotes</span>
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Create New Order"
        subtitle="Add customer contact information and delivery details. Frame configuration follows next."
      />

      <Card className="max-w-3xl rounded-2xl border border-border bg-card shadow-xs">
        <CardHeader className="border-b border-border/60 px-6 py-4.5">
          <CardTitle className="text-title-2 font-bold text-brand-txt-primary">
            Customer & Delivery Specification
          </CardTitle>
          <CardDescription className="text-subtitle text-brand-txt-secondary">
            The order number and draft date are created automatically upon submission.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <OrderIntakeForm />
        </CardContent>
      </Card>
    </div>
  );
}
