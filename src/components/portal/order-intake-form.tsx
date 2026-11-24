"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOrderAction } from "@/server/orders/actions";
import { CreateOrderSchema, type CreateOrderInput } from "@/server/orders/schemas";

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
    <form onSubmit={submit} noValidate data-test="new-order-form" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label
            htmlFor="oi-customer-name"
            className="text-subtitle font-medium text-brand-txt-primary"
          >
            Customer name
          </Label>
          <Input
            id="oi-customer-name"
            autoComplete="name"
            aria-invalid={Boolean(form.formState.errors.customer_name)}
            {...form.register("customer_name")}
          />
          {form.formState.errors.customer_name && (
            <p className="text-xs text-destructive">
              {form.formState.errors.customer_name.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oi-phone" className="text-subtitle font-medium text-brand-txt-primary">
            Phone
          </Label>
          <Input
            id="oi-phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(form.formState.errors.phone)}
            {...form.register("phone")}
          />
          {form.formState.errors.phone && (
            <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="oi-address" className="text-subtitle font-medium text-brand-txt-primary">
          Address
        </Label>
        <Input
          id="oi-address"
          autoComplete="street-address"
          aria-invalid={Boolean(form.formState.errors.address)}
          {...form.register("address")}
        />
        {form.formState.errors.address && (
          <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="oi-city" className="text-subtitle font-medium text-brand-txt-primary">
            City
          </Label>
          <Input
            id="oi-city"
            autoComplete="address-level2"
            aria-invalid={Boolean(form.formState.errors.city)}
            {...form.register("city")}
          />
          {form.formState.errors.city && (
            <p className="text-xs text-destructive">{form.formState.errors.city.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oi-state" className="text-subtitle font-medium text-brand-txt-primary">
            State
          </Label>
          <Input
            id="oi-state"
            autoComplete="address-level1"
            aria-invalid={Boolean(form.formState.errors.state)}
            {...form.register("state")}
          />
          {form.formState.errors.state && (
            <p className="text-xs text-destructive">{form.formState.errors.state.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oi-zip" className="text-subtitle font-medium text-brand-txt-primary">
            ZIP code
          </Label>
          <Input
            id="oi-zip"
            autoComplete="postal-code"
            aria-invalid={Boolean(form.formState.errors.zip_code)}
            {...form.register("zip_code")}
          />
          {form.formState.errors.zip_code && (
            <p className="text-xs text-destructive">{form.formState.errors.zip_code.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="oi-delivery-date"
          className="text-subtitle font-medium text-brand-txt-primary"
        >
          Delivery date
        </Label>
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
        <p className="text-xs text-muted-foreground">
          Optional. The order date is recorded automatically.
        </p>
        {form.formState.errors.delivery_date && (
          <p className="text-xs text-destructive">{form.formState.errors.delivery_date.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="oi-note" className="text-subtitle font-medium text-brand-txt-primary">
          Note
        </Label>
        <Textarea id="oi-note" rows={3} {...form.register("note")} />
        {form.formState.errors.note && (
          <p className="text-xs text-destructive">{form.formState.errors.note.message}</p>
        )}
      </div>

      {message && (
        <p className="text-subtitle font-medium text-destructive" role="alert">
          {message}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="submit" variant="primary" disabled={pending} data-test="create-order">
          {pending ? "Creating order…" : "Continue to door selection"}
        </Button>
      </div>
    </form>
  );
}
