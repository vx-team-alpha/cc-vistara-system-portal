"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import * as React from "react";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOrderAction } from "@/server/orders/actions";
import { CreateOrderSchema, type CreateOrderInput } from "@/server/orders/schemas";

export function NewOrderDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setUncontrolledOpen;

  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const form = useForm<CreateOrderInput>({
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

  const onSubmit = form.handleSubmit((values: CreateOrderInput) => {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await createOrderAction(values);
        if (result && !result.ok) {
          setMessage(result.error);
        }
      } catch (error) {
        if (error instanceof Error && error.message === "NEXT_REDIRECT") {
          setOpen?.(false);
          throw error;
        }
        setMessage("Could not create the order. Please try again.");
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="secondery" size="sm" className="gap-2">
            <Plus className="size-4" />
            <span>New order</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-h3 font-bold text-brand-txt-primary">
            Create New Order
          </DialogTitle>
          <DialogDescription className="text-subtitle text-brand-txt-secondary">
            Add customer contact details and delivery schedule. Frame specification follows next.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate data-test="new-order-form" className="space-y-4 pt-2">
          {/* Customer Name & Phone */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="customer_name"
                className="text-subtitle font-medium text-brand-txt-primary"
              >
                Customer name
              </Label>
              <Input
                id="customer_name"
                placeholder="e.g. John Doe"
                autoComplete="name"
                aria-invalid={Boolean(form.formState.errors.customer_name)}
                {...form.register("customer_name")}
              />
              {form.formState.errors.customer_name && (
                <p className="text-caption text-brand-accent4">
                  {form.formState.errors.customer_name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-subtitle font-medium text-brand-txt-primary">
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g. +44 7123 456789"
                autoComplete="tel"
                aria-invalid={Boolean(form.formState.errors.phone)}
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p className="text-caption text-brand-accent4">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-subtitle font-medium text-brand-txt-primary">
              Address
            </Label>
            <Input
              id="address"
              placeholder="e.g. 12 High Street"
              autoComplete="street-address"
              aria-invalid={Boolean(form.formState.errors.address)}
              {...form.register("address")}
            />
            {form.formState.errors.address && (
              <p className="text-caption text-brand-accent4">
                {form.formState.errors.address.message}
              </p>
            )}
          </div>

          {/* City, State, ZIP */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-subtitle font-medium text-brand-txt-primary">
                City
              </Label>
              <Input
                id="city"
                placeholder="e.g. London"
                autoComplete="address-level2"
                aria-invalid={Boolean(form.formState.errors.city)}
                {...form.register("city")}
              />
              {form.formState.errors.city && (
                <p className="text-caption text-brand-accent4">
                  {form.formState.errors.city.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="state" className="text-subtitle font-medium text-brand-txt-primary">
                State / County
              </Label>
              <Input
                id="state"
                placeholder="e.g. Greater London"
                autoComplete="address-level1"
                aria-invalid={Boolean(form.formState.errors.state)}
                {...form.register("state")}
              />
              {form.formState.errors.state && (
                <p className="text-caption text-brand-accent4">
                  {form.formState.errors.state.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="zip_code"
                className="text-subtitle font-medium text-brand-txt-primary"
              >
                Postcode / ZIP
              </Label>
              <Input
                id="zip_code"
                placeholder="e.g. SW1A 1AA"
                autoComplete="postal-code"
                aria-invalid={Boolean(form.formState.errors.zip_code)}
                {...form.register("zip_code")}
              />
              {form.formState.errors.zip_code && (
                <p className="text-caption text-brand-accent4">
                  {form.formState.errors.zip_code.message}
                </p>
              )}
            </div>
          </div>

          {/* Delivery Date */}
          <div className="space-y-1.5">
            <Label className="text-subtitle font-medium text-brand-txt-primary">
              Requested delivery date
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
            <p className="text-caption text-brand-txt-secondary">
              Optional. The order creation date is tracked automatically.
            </p>
            {form.formState.errors.delivery_date && (
              <p className="text-caption text-brand-accent4">
                {form.formState.errors.delivery_date.message}
              </p>
            )}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-subtitle font-medium text-brand-txt-primary">
              Order notes
            </Label>
            <Textarea
              id="note"
              placeholder="Any special customer requirements or delivery instructions..."
              rows={3}
              {...form.register("note")}
            />
            {form.formState.errors.note && (
              <p className="text-caption text-brand-accent4">
                {form.formState.errors.note.message}
              </p>
            )}
          </div>

          {message && (
            <div className="rounded-lg border border-brand-accent4/20 bg-brand-accent4/10 p-3 text-sm text-brand-accent4">
              {message}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="light" size="sm" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="secondery"
              size="sm"
              disabled={pending}
              data-test="create-order"
            >
              {pending ? "Creating order…" : "Continue to door selection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default NewOrderDialog;
