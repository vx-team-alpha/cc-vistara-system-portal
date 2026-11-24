"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { updateOrderAction } from "@/server/orders/actions";
import { UpdateOrderSchema, type UpdateOrderInput } from "@/server/orders/schemas";
import type { Json } from "@/types/supabase";

interface CustomerSnapshot {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

function parseCustomerSnapshot(value: Json): CustomerSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as CustomerSnapshot;
}

export function EditOrderDialog({
  order,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
}: {
  order: {
    id: string;
    order_number: string;
    revision: number;
    delivery_date: string | null;
    note?: string | null;
    customer_snapshot: Json;
  };
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
  const router = useRouter();

  const customer = parseCustomerSnapshot(order.customer_snapshot);

  const form = useForm({
    resolver: zodResolver(UpdateOrderSchema),
    defaultValues: {
      order_id: order.id,
      revision: order.revision,
      customer_name: customer.name || "",
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      zip_code: customer.zip_code || "",
      delivery_date: order.delivery_date ? order.delivery_date.slice(0, 10) : "",
      note: order.note || "",
      update_customer_profile: false,
    },
  });

  const onSubmit = form.handleSubmit((values: UpdateOrderInput) => {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await updateOrderAction(values);
        if (result && !result.ok) {
          setMessage(result.error);
          return;
        }
        setOpen?.(false);
        router.refresh();
      } catch (error) {
        if (error instanceof Error && error.message === "NEXT_REDIRECT") {
          setOpen?.(false);
          router.refresh();
          return;
        }
        setMessage("Could not update the order. Please try again.");
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5" data-test="edit-order">
            <Edit3 className="size-3.5" />
            <span>Edit Details</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-h3 font-bold text-brand-txt-primary">
            Edit Order {order.order_number}
          </DialogTitle>
          <DialogDescription className="text-subtitle text-brand-txt-secondary">
            Modify customer contact details and requested delivery schedule for this draft.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate data-test="edit-order-form" className="space-y-4 pt-2">
          <input type="hidden" {...form.register("order_id")} />
          <input type="hidden" {...form.register("revision", { valueAsNumber: true })} />

          {/* Customer Name & Phone */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="edit_customer_name"
                className="text-subtitle font-medium text-brand-txt-primary"
              >
                Customer name
              </Label>
              <Input
                id="edit_customer_name"
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
              <Label
                htmlFor="edit_phone"
                className="text-subtitle font-medium text-brand-txt-primary"
              >
                Phone
              </Label>
              <Input
                id="edit_phone"
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
            <Label
              htmlFor="edit_address"
              className="text-subtitle font-medium text-brand-txt-primary"
            >
              Address
            </Label>
            <Input
              id="edit_address"
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
              <Label
                htmlFor="edit_city"
                className="text-subtitle font-medium text-brand-txt-primary"
              >
                City
              </Label>
              <Input
                id="edit_city"
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
              <Label
                htmlFor="edit_state"
                className="text-subtitle font-medium text-brand-txt-primary"
              >
                State / County
              </Label>
              <Input
                id="edit_state"
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
                htmlFor="edit_zip_code"
                className="text-subtitle font-medium text-brand-txt-primary"
              >
                Postcode / ZIP
              </Label>
              <Input
                id="edit_zip_code"
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
            {form.formState.errors.delivery_date && (
              <p className="text-caption text-brand-accent4">
                {form.formState.errors.delivery_date.message}
              </p>
            )}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="edit_note" className="text-subtitle font-medium text-brand-txt-primary">
              Order notes
            </Label>
            <Textarea
              id="edit_note"
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

          {/* Update Customer Profile Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="update_customer_profile"
              className="size-4 rounded border-border text-brand-accent1 focus:ring-brand-accent1"
              {...form.register("update_customer_profile")}
            />
            <Label
              htmlFor="update_customer_profile"
              className="text-caption cursor-pointer text-brand-txt-secondary"
            >
              Update saved customer profile with these details
            </Label>
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
              data-test="save-order"
            >
              {pending ? "Saving changes…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditOrderDialog;
