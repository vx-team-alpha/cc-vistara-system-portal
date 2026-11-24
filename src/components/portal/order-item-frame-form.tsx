"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { createOrderItemAction, updateOrderItemAction } from "@/server/orders/actions";
import { CreateOrderItemSchema, UpdateOrderItemSchema } from "@/server/orders/schemas";

import s from "./portal.module.css";

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
    <form onSubmit={submit} noValidate data-test="frame-details-form">
      <input type="hidden" {...form.register("order_id")} />
      <input type="hidden" {...form.register("item_id")} />
      <input type="hidden" {...form.register("layout_id")} />
      <input type="hidden" {...form.register("revision")} />
      <div className={s.field}>
        <span className={s.label}>Profile system</span>
        <div className={s.systemSelector} role="radiogroup" aria-label="Profile system">
          <label className={s.systemCard} data-active={selectedSystem === "eurocell"}>
            <input
              type="radio"
              value="eurocell"
              className={s.srOnly}
              {...form.register("system")}
            />
            <span className={s.systemCardTitle}>Eurocell Composite</span>
            <span className={s.systemCardDesc}>70mm Eurologik Outer Frame · 85–225mm Cills</span>
          </label>
          <label className={s.systemCard} data-active={selectedSystem === "rehau"}>
            <input type="radio" value="rehau" className={s.srOnly} {...form.register("system")} />
            <span className={s.systemCardTitle}>Rehau Total70</span>
            <span className={s.systemCardDesc}>72mm Rehau Outer Frame · 95–180mm Cills</span>
          </label>
        </div>
      </div>
      <div className={s.formGrid}>
        <label className={s.field}>
          <span className={s.label}>Width (mm)</span>
          <input
            className={s.input}
            type="number"
            inputMode="numeric"
            min={300}
            max={2800}
            step={1}
            aria-invalid={Boolean(form.formState.errors.width_mm)}
            {...form.register("width_mm")}
          />
          {form.formState.errors.width_mm && (
            <span className={s.fieldError}>{form.formState.errors.width_mm.message}</span>
          )}
        </label>
        <label className={s.field}>
          <span className={s.label}>Height (mm)</span>
          <input
            className={s.input}
            type="number"
            inputMode="numeric"
            min={1750}
            max={2500}
            step={1}
            aria-invalid={Boolean(form.formState.errors.height_mm)}
            {...form.register("height_mm")}
          />
          {form.formState.errors.height_mm && (
            <span className={s.fieldError}>{form.formState.errors.height_mm.message}</span>
          )}
        </label>
        <label className={s.field}>
          <span className={s.label}>Quantity</span>
          <input
            className={s.input}
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            step={1}
            aria-invalid={Boolean(form.formState.errors.quantity)}
            {...form.register("quantity")}
          />
          {form.formState.errors.quantity && (
            <span className={s.fieldError}>{form.formState.errors.quantity.message}</span>
          )}
        </label>
        <label className={s.field}>
          <span className={s.label}>Location</span>
          <input
            className={s.input}
            placeholder="For example: Front entrance"
            aria-invalid={Boolean(form.formState.errors.location)}
            {...form.register("location")}
          />
          {form.formState.errors.location && (
            <span className={s.fieldError}>{form.formState.errors.location.message}</span>
          )}
        </label>
      </div>
      <p className={s.hint}>
        Measurements are saved on this door and used by its drawing and documents.
      </p>
      {message && (
        <p className={s.notice} data-error role="alert">
          {message}
        </p>
      )}
      <div className={s.actions}>
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
