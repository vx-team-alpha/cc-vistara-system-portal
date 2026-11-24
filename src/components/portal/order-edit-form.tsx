"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
          <Input
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
          <Input
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
        <Input
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
          <Input autoComplete="address-level2" {...form.register("city")} />
          {form.formState.errors.city && (
            <span className={s.fieldError}>{form.formState.errors.city.message}</span>
          )}
        </label>
        <label className={s.field}>
          <span className={s.label}>State</span>
          <Input autoComplete="address-level1" {...form.register("state")} />
          {form.formState.errors.state && (
            <span className={s.fieldError}>{form.formState.errors.state.message}</span>
          )}
        </label>
        <label className={s.field}>
          <span className={s.label}>ZIP code</span>
          <Input autoComplete="postal-code" {...form.register("zip_code")} />
          {form.formState.errors.zip_code && (
            <span className={s.fieldError}>{form.formState.errors.zip_code.message}</span>
          )}
        </label>
      </div>
      <label className={s.field}>
        <span className={s.label}>Delivery date</span>
        <Input type="date" {...form.register("delivery_date")} />
        {form.formState.errors.delivery_date && (
          <span className={s.fieldError}>{form.formState.errors.delivery_date.message}</span>
        )}
      </label>
      <label className={s.field}>
        <span className={s.label}>Note</span>
        <Textarea {...form.register("note")} />
        {form.formState.errors.note && (
          <span className={s.fieldError}>{form.formState.errors.note.message}</span>
        )}
      </label>
      <div className={s.checkField}>
        <Controller
          control={form.control}
          name="update_customer_profile"
          render={({ field }) => (
            <Checkbox
              id="update_customer_profile"
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <label htmlFor="update_customer_profile" className="cursor-pointer">
          <strong>Update the reusable customer profile too</strong>
          <small>Leave off to change only this order snapshot.</small>
        </label>
      </div>
      {message && (
        <p className={s.notice} data-error role="alert">
          {message}
        </p>
      )}
      <div className={s.actions}>
        <Button type="submit" variant="primary" disabled={pending} data-test="save-order-details">
          {pending ? "Saving changes…" : "Save order details"}
        </Button>
      </div>
    </form>
  );
}
