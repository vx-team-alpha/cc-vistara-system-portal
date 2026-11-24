"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrderItemAction, updateOrderItemAction } from "@/server/orders/actions";
import { CreateOrderItemSchema, UpdateOrderItemSchema } from "@/server/orders/schemas";

export function OrderItemFrameForm({
  orderId,
  layoutId,
  revision,
  item,
}: {
  orderId: string;
  layoutId: string;
  revision: number;
  item?: {
    id: string;
    layout_id: string | null;
    system?: string;
    width_mm: number;
    height_mm: number;
    quantity: number;
    location: string;
  };
}) {
  const editing = Boolean(item);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const form = useForm({
    resolver: zodResolver(UpdateOrderItemSchema),
    defaultValues: {
      order_id: orderId,
      item_id: item?.id ?? "00000000-0000-0000-0000-000000000000",
      layout_id: layoutId,
      system: (item?.system === "rehau" ? "rehau" : "eurocell") as "eurocell" | "rehau",
      revision,
      width_mm: item?.width_mm ?? 900,
      height_mm: item?.height_mm ?? 2100,
      quantity: item?.quantity ?? 1,
      location: item?.location ?? "",
    },
  });

  const selectedSystem = useWatch({ control: form.control, name: "system" }) ?? "eurocell";

  const submit = form.handleSubmit((values) => {
    const styleChanged = item?.layout_id && item.layout_id !== layoutId;
    const systemChanged = item?.system && item.system !== values.system;
    if (
      (styleChanged || systemChanged) &&
      !window.confirm(
        "Changing the door style or profile system will permanently reset its saved configuration and drawings. Continue?",
      )
    ) {
      return;
    }
    setMessage("");
    startTransition(async () => {
      try {
        const result = editing
          ? await updateOrderItemAction(UpdateOrderItemSchema.parse(values))
          : await createOrderItemAction(CreateOrderItemSchema.parse(values));
        if (result && !result.ok) setMessage(result.error);
      } catch (error) {
        if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
        setMessage("Could not save the frame details. Please try again.");
      }
    });
  });

  return (
    <form onSubmit={submit} noValidate data-test="order-item-frame-form" className="space-y-5">
      <input type="hidden" {...form.register("order_id")} />
      <input type="hidden" {...form.register("item_id")} />
      <input type="hidden" {...form.register("layout_id")} />
      <input type="hidden" {...form.register("revision")} />

      <div className="space-y-2">
        <Label className="text-subtitle font-semibold text-brand-txt-primary">Profile system</Label>
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Profile system"
        >
          <label
            className={`group relative flex cursor-pointer flex-col rounded-xl border p-4 transition-all ${
              selectedSystem === "eurocell"
                ? "border-brand-accent1 bg-brand-accent1/5 ring-2 ring-brand-accent1/20"
                : "border-border bg-card hover:border-brand-accent1/40 hover:bg-brand-backgroundSecondary/50"
            }`}
          >
            <input type="radio" value="eurocell" className="sr-only" {...form.register("system")} />
            <span className="text-body font-bold text-brand-txt-primary">Eurocell Composite</span>
            <span className="text-caption mt-1 text-brand-txt-secondary">
              70mm Eurologik Outer Frame · 85–225mm Cills
            </span>
          </label>
          <label
            className={`group relative flex cursor-pointer flex-col rounded-xl border p-4 transition-all ${
              selectedSystem === "rehau"
                ? "border-brand-accent1 bg-brand-accent1/5 ring-2 ring-brand-accent1/20"
                : "border-border bg-card hover:border-brand-accent1/40 hover:bg-brand-backgroundSecondary/50"
            }`}
          >
            <input type="radio" value="rehau" className="sr-only" {...form.register("system")} />
            <span className="text-body font-bold text-brand-txt-primary">Rehau Total70</span>
            <span className="text-caption mt-1 text-brand-txt-secondary">
              72mm Rehau Outer Frame · 95–180mm Cills
            </span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="oif-width" className="text-subtitle font-medium text-brand-txt-primary">
            Width (mm)
          </Label>
          <Input
            id="oif-width"
            type="number"
            inputMode="numeric"
            min={300}
            max={2800}
            step={1}
            aria-invalid={Boolean(form.formState.errors.width_mm)}
            {...form.register("width_mm")}
          />
          {form.formState.errors.width_mm && (
            <p className="text-xs text-destructive">{form.formState.errors.width_mm.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="oif-height" className="text-subtitle font-medium text-brand-txt-primary">
            Height (mm)
          </Label>
          <Input
            id="oif-height"
            type="number"
            inputMode="numeric"
            min={1750}
            max={2500}
            step={1}
            aria-invalid={Boolean(form.formState.errors.height_mm)}
            {...form.register("height_mm")}
          />
          {form.formState.errors.height_mm && (
            <p className="text-xs text-destructive">{form.formState.errors.height_mm.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="oif-qty" className="text-subtitle font-medium text-brand-txt-primary">
            Quantity
          </Label>
          <Input
            id="oif-qty"
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            step={1}
            aria-invalid={Boolean(form.formState.errors.quantity)}
            {...form.register("quantity")}
          />
          {form.formState.errors.quantity && (
            <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="oif-loc" className="text-subtitle font-medium text-brand-txt-primary">
            Location
          </Label>
          <Input
            id="oif-loc"
            placeholder="For example: Front entrance"
            aria-invalid={Boolean(form.formState.errors.location)}
            {...form.register("location")}
          />
          {form.formState.errors.location && (
            <p className="text-xs text-destructive">{form.formState.errors.location.message}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Measurements are saved on this door and used by its drawing and documents.
      </p>

      {message && (
        <p className="text-subtitle font-medium text-destructive" role="alert">
          {message}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="primary" type="submit" disabled={pending} data-test="save-frame-details">
          {pending
            ? "Saving frame details…"
            : editing
              ? "Save frame and continue"
              : "Continue to door questions"}
        </Button>
      </div>
    </form>
  );
}
