"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createOrderAction } from "@/server/orders/actions";
import { CreateOrderSchema, type CreateOrderInput } from "@/server/orders/schemas";

import s from "./portal.module.css";

export function OrderIntakeForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const form = useForm({
    resolver: zodResolver(CreateOrderSchema),
    defaultValues: {
      customer_name: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      delivery_date: "",
      note: "",
    },
  });

  const submit = form.handleSubmit((values: CreateOrderInput) => {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await createOrderAction(values);
        if (result && !result.ok) setMessage(result.error);
      } catch (error) {
        if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
        setMessage("Could not create the order. Please try again.");
      }
    });
  });

  return (
    <form onSubmit={submit} noValidate data-test="new-order-form">
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
          <Input
            autoComplete="address-level2"
            aria-invalid={Boolean(form.formState.errors.city)}
            {...form.register("city")}
          />
          {form.formState.errors.city && (
            <span className={s.fieldError}>{form.formState.errors.city.message}</span>
          )}
        </label>
        <label className={s.field}>
          <span className={s.label}>State</span>
          <Input
            autoComplete="address-level1"
            aria-invalid={Boolean(form.formState.errors.state)}
            {...form.register("state")}
          />
          {form.formState.errors.state && (
            <span className={s.fieldError}>{form.formState.errors.state.message}</span>
          )}
        </label>
        <label className={s.field}>
          <span className={s.label}>ZIP code</span>
          <Input
            autoComplete="postal-code"
            aria-invalid={Boolean(form.formState.errors.zip_code)}
            {...form.register("zip_code")}
          />
          {form.formState.errors.zip_code && (
            <span className={s.fieldError}>{form.formState.errors.zip_code.message}</span>
          )}
        </label>
      </div>
      <div className={s.field}>
        <span className={s.label}>Delivery date</span>
        <Controller
          control={form.control}
          name="delivery_date"
          render={({ field }) => (
            <DatePicker
              value={field.value}
              onChange={field.onChange}
              placeholder="Pick a delivery date"
              disabled={pending}
              aria-invalid={Boolean(form.formState.errors.delivery_date)}
              data-test="delivery-date-picker"
            />
          )}
        />
        <span className={s.hint}>Optional. The order date is recorded automatically.</span>
        {form.formState.errors.delivery_date && (
          <span className={s.fieldError}>{form.formState.errors.delivery_date.message}</span>
        )}
      </div>
      <label className={s.field}>
        <span className={s.label}>Note</span>
        <Textarea {...form.register("note")} />
        {form.formState.errors.note && (
          <span className={s.fieldError}>{form.formState.errors.note.message}</span>
        )}
      </label>
      {message && (
        <p className={s.notice} data-error role="alert">
          {message}
        </p>
      )}
      <div className={s.actions}>
        <Button type="submit" variant="primary" disabled={pending} data-test="create-order">
          {pending ? "Creating order…" : "Continue to door selection"}
        </Button>
      </div>
    </form>
  );
}
