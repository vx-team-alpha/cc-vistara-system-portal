"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { updateOrderAction } from "@/server/orders/actions";
import { UpdateOrderSchema, type UpdateOrderInput } from "@/server/orders/schemas";

import s from "./portal.module.css";

export function OrderEditForm({ initialValues }: { initialValues: UpdateOrderInput }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const form = useForm({
    resolver: zodResolver(UpdateOrderSchema),
    defaultValues: initialValues,
  });

  const submit = form.handleSubmit((values: UpdateOrderInput) => {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await updateOrderAction(values);
        if (result && !result.ok) setMessage(result.error);
      } catch (error) {
        if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
        setMessage("Could not update the order. Please try again.");
      }
    });
  });

  return (
    <form onSubmit={submit} noValidate data-test="edit-order-form">
      <input type="hidden" {...form.register("order_id")} />
      <input type="hidden" {...form.register("revision")} />
      <div className={s.formGrid}>
        <label className={s.field}>
          <span className={s.label}>Customer name</span>
          <input
            className={s.input}
            autoComplete="name"
            aria-invalid={Boolean(form.formState.errors.customer_name)}
            {...form.register("customer_name")}
          />
          {form.formState.errors.customer_name && (
            <span className={s.fieldError}>{form.formState.errors.customer_name.message}</span>
          )}
        </label>
        <label className={s.field}>
          <span className={s.label}>Phone</span>
          <input
            className={s.input}
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(form.formState.errors.phone)}
            {...form.register("phone")}
          />
          {form.formState.errors.phone && (
            <span className={s.fieldError}>{form.formState.errors.phone.message}</span>
          )}
        </label>
      </div>
      <label className={s.field}>
        <span className={s.label}>Address</span>
        <input
          className={s.input}
          autoComplete="street-address"
          aria-invalid={Boolean(form.formState.errors.address)}
          {...form.register("address")}
        />
        {form.formState.errors.address && (
          <span className={s.fieldError}>{form.formState.errors.address.message}</span>
        )}
      </label>
      <div className={s.formGrid3}>
        <label className={s.field}>
          <span className={s.label}>City</span>
          <input className={s.input} autoComplete="address-level2" {...form.register("city")} />
          {form.formState.errors.city && (
            <span className={s.fieldError}>{form.formState.errors.city.message}</span>
          )}
        </label>
        <label className={s.field}>
          <span className={s.label}>State</span>
          <input className={s.input} autoComplete="address-level1" {...form.register("state")} />
          {form.formState.errors.state && (
            <span className={s.fieldError}>{form.formState.errors.state.message}</span>
          )}
        </label>
        <label className={s.field}>
          <span className={s.label}>ZIP code</span>
          <input className={s.input} autoComplete="postal-code" {...form.register("zip_code")} />
          {form.formState.errors.zip_code && (
            <span className={s.fieldError}>{form.formState.errors.zip_code.message}</span>
          )}
        </label>
      </div>
      <label className={s.field}>
        <span className={s.label}>Delivery date</span>
        <input className={s.input} type="date" {...form.register("delivery_date")} />
        {form.formState.errors.delivery_date && (
          <span className={s.fieldError}>{form.formState.errors.delivery_date.message}</span>
        )}
      </label>
      <label className={s.field}>
        <span className={s.label}>Note</span>
        <textarea className={s.textarea} {...form.register("note")} />
        {form.formState.errors.note && (
          <span className={s.fieldError}>{form.formState.errors.note.message}</span>
        )}
      </label>
      <label className={s.checkField}>
        <input type="checkbox" {...form.register("update_customer_profile")} />
        <span>
          <strong>Update the reusable customer profile too</strong>
          <small>Leave off to change only this order snapshot.</small>
        </span>
      </label>
      {message && (
        <p className={s.notice} data-error role="alert">
          {message}
        </p>
      )}
      <div className={s.actions}>
        <button
          type="submit"
          className={`${s.btn} ${s.btnPrimary}`}
          disabled={pending}
          data-test="save-order-details"
        >
          {pending ? "Saving changes…" : "Save order details"}
        </button>
      </div>
    </form>
  );
}
