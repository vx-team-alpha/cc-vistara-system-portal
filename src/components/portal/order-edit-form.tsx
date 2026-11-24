"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateOrderAction } from "@/server/orders/actions";
import { UpdateOrderSchema, type UpdateOrderInput } from "@/server/orders/schemas";

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
    <form onSubmit={submit} noValidate data-test="edit-order-form" className="space-y-4">
      <input type="hidden" {...form.register("order_id")} />
      <input type="hidden" {...form.register("revision")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label
            htmlFor="oe-customer-name"
            className="text-subtitle font-medium text-brand-txt-primary"
          >
            Customer name
          </Label>
          <Input
            id="oe-customer-name"
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
          <Label htmlFor="oe-phone" className="text-subtitle font-medium text-brand-txt-primary">
            Phone
          </Label>
          <Input
            id="oe-phone"
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
        <Label htmlFor="oe-address" className="text-subtitle font-medium text-brand-txt-primary">
          Address
        </Label>
        <Input
          id="oe-address"
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
          <Label htmlFor="oe-city" className="text-subtitle font-medium text-brand-txt-primary">
            City
          </Label>
          <Input id="oe-city" autoComplete="address-level2" {...form.register("city")} />
          {form.formState.errors.city && (
            <p className="text-xs text-destructive">{form.formState.errors.city.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oe-state" className="text-subtitle font-medium text-brand-txt-primary">
            State
          </Label>
          <Input id="oe-state" autoComplete="address-level1" {...form.register("state")} />
          {form.formState.errors.state && (
            <p className="text-xs text-destructive">{form.formState.errors.state.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oe-zip" className="text-subtitle font-medium text-brand-txt-primary">
            ZIP code
          </Label>
          <Input id="oe-zip" autoComplete="postal-code" {...form.register("zip_code")} />
          {form.formState.errors.zip_code && (
            <p className="text-xs text-destructive">{form.formState.errors.zip_code.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="oe-delivery-date"
          className="text-subtitle font-medium text-brand-txt-primary"
        >
          Delivery date
        </Label>
        <Input id="oe-delivery-date" type="date" {...form.register("delivery_date")} />
        {form.formState.errors.delivery_date && (
          <p className="text-xs text-destructive">{form.formState.errors.delivery_date.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="oe-note" className="text-subtitle font-medium text-brand-txt-primary">
          Note
        </Label>
        <Textarea id="oe-note" rows={3} {...form.register("note")} />
        {form.formState.errors.note && (
          <p className="text-xs text-destructive">{form.formState.errors.note.message}</p>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-brand-backgroundSecondary p-3">
        <Controller
          control={form.control}
          name="update_customer_profile"
          render={({ field }) => (
            <Checkbox
              id="update_customer_profile"
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              className="mt-0.5"
            />
          )}
        />
        <label htmlFor="update_customer_profile" className="cursor-pointer space-y-0.5 text-xs">
          <p className="font-semibold text-brand-txt-primary">
            Update the reusable customer profile too
          </p>
          <p className="text-muted-foreground">Leave off to change only this order snapshot.</p>
        </label>
      </div>

      {message && (
        <p className="text-subtitle font-medium text-destructive" role="alert">
          {message}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="submit" variant="primary" disabled={pending} data-test="save-order-details">
          {pending ? "Saving changes…" : "Save order details"}
        </Button>
      </div>
    </form>
  );
}
