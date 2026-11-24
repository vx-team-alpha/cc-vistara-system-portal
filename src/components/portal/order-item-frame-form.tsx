"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { createOrderItemAction } from "@/server/orders/actions";
import { CreateOrderItemSchema, type CreateOrderItemInput } from "@/server/orders/schemas";

import s from "./portal.module.css";

export function OrderItemFrameForm({ orderId, layoutId }: { orderId: string; layoutId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const form = useForm({
    resolver: zodResolver(CreateOrderItemSchema),
    defaultValues: {
      order_id: orderId,
      layout_id: layoutId,
      width_mm: 900,
      height_mm: 2100,
      quantity: 1,
      location: "",
    },
  });

  const submit = form.handleSubmit((values: CreateOrderItemInput) => {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await createOrderItemAction(values);
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
      <input type="hidden" {...form.register("layout_id")} />
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
        <button
          className={`${s.btn} ${s.btnPrimary}`}
          type="submit"
          disabled={pending}
          data-test="save-frame-details"
        >
          {pending ? "Saving frame details…" : "Continue to door questions"}
        </button>
      </div>
    </form>
  );
}
