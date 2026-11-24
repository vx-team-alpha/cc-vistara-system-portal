"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { canTransitionOrder } from "@/lib/orders/lifecycle";
import { authAction, type TypedSupabaseClient } from "@/server/auth-wrapper";
import { ConfigurationSchema } from "@/server/portal/schemas";

import {
  CreateOrderItemSchema,
  CreateOrderSchema,
  DeleteOrderSchema,
  OrderItemMutationSchema,
  SaveOrderItemConfigurationSchema,
  UpdateOrderItemSchema,
  UpdateOrderSchema,
  UpdateOrderStatusSchema,
} from "./schemas";

const conflictError = "The order changed while you were editing it. Refresh and try again.";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return value.trim().startsWith("+") ? `+${digits}` : digits;
}

async function claimDraftRevision(
  supabase: TypedSupabaseClient,
  accountId: string,
  orderId: string,
  revision: number,
) {
  const nextRevision = revision + 1;
  const { data, error } = await supabase
    .from("orders")
    .update({ revision: nextRevision })
    .eq("id", orderId)
    .eq("account_id", accountId)
    .eq("status", "draft")
    .eq("revision", revision)
    .select("id")
    .maybeSingle();

  return { claimed: !error && Boolean(data), nextRevision };
}

function revalidateOrder(orderId: string) {
  revalidateTag("orders", "max");
  revalidatePath("/home");
  revalidatePath("/home/quotes");
  revalidatePath(`/home/quotes/${orderId}`);
  revalidatePath(`/print/orders/${orderId}`);
}

export const createOrderAction = authAction(
  async ({ supabase, account }, input) => {
    const phoneNormalized = normalizePhone(input.phone);
    const customerValues = {
      account_id: account.id,
      name: input.customer_name,
      phone: input.phone,
      phone_normalized: phoneNormalized,
      address: input.address,
      city: input.city,
      state: input.state,
      zip_code: input.zip_code,
    };

    const { data: existingCustomer, error: lookupError } = await supabase
      .from("customers")
      .select("id")
      .eq("account_id", account.id)
      .eq("phone_normalized", phoneNormalized)
      .ilike("name", input.customer_name)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      return { ok: false as const, error: "Could not search customers. Please try again." };
    }

    let customerId = existingCustomer?.id;
    if (customerId) {
      const { error } = await supabase
        .from("customers")
        .update(customerValues)
        .eq("id", customerId);
      if (error) {
        return { ok: false as const, error: "Could not update the customer details." };
      }
    } else {
      const { data: customer, error } = await supabase
        .from("customers")
        .insert(customerValues)
        .select("id")
        .single();
      if (error || !customer) {
        return { ok: false as const, error: "Could not save the customer details." };
      }
      customerId = customer.id;
    }

    const customerSnapshot = {
      name: input.customer_name,
      phone: input.phone,
      address: input.address,
      city: input.city,
      state: input.state,
      zip_code: input.zip_code,
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        account_id: account.id,
        customer_id: customerId,
        sequence_number: 0,
        order_number: "pending",
        customer_snapshot: customerSnapshot,
        delivery_date: input.delivery_date || null,
        note: input.note,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return { ok: false as const, error: "Could not create the order. Please try again." };
    }

    await supabase.from("order_events").insert({
      order_id: order.id,
      account_id: account.id,
      event_type: "order_created",
      next_status: "draft",
      revision: 1,
    });

    revalidateTag("orders", "max");
    revalidatePath("/home", "layout");
    redirect(`/home/quotes/${order.id}/items/new`);
  },
  { schema: CreateOrderSchema },
);

export const updateOrderAction = authAction(
  async ({ supabase, account }, input) => {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,customer_id,status,revision")
      .eq("id", input.order_id)
      .eq("account_id", account.id)
      .maybeSingle();

    if (orderError || !order || order.status !== "draft") {
      return { ok: false as const, error: "Only draft orders can be edited." };
    }
    if (order.revision !== input.revision) {
      return { ok: false as const, error: conflictError };
    }

    const customerSnapshot = {
      name: input.customer_name,
      phone: input.phone,
      address: input.address,
      city: input.city,
      state: input.state,
      zip_code: input.zip_code,
    };
    const nextRevision = order.revision + 1;
    const { data: updatedOrder, error } = await supabase
      .from("orders")
      .update({
        customer_snapshot: customerSnapshot,
        delivery_date: input.delivery_date || null,
        note: input.note,
        revision: nextRevision,
      })
      .eq("id", order.id)
      .eq("account_id", account.id)
      .eq("status", "draft")
      .eq("revision", order.revision)
      .select("id")
      .maybeSingle();

    if (error) return { ok: false as const, error: "Could not update the order details." };
    if (!updatedOrder) return { ok: false as const, error: conflictError };

    if (input.update_customer_profile) {
      const { error: customerError } = await supabase
        .from("customers")
        .update({
          ...customerSnapshot,
          phone_normalized: normalizePhone(input.phone),
        })
        .eq("id", order.customer_id)
        .eq("account_id", account.id);
      if (customerError) {
        return {
          ok: false as const,
          error: "The order was updated, but the reusable customer profile could not be updated.",
        };
      }
    }

    await supabase.from("order_events").insert({
      order_id: order.id,
      account_id: account.id,
      event_type: "order_updated",
      revision: nextRevision,
      metadata: { customer_profile_updated: input.update_customer_profile },
    });

    revalidateOrder(order.id);
    redirect(`/home/quotes/${order.id}`);
  },
  { schema: UpdateOrderSchema },
);

export const createOrderItemAction = authAction(
  async ({ supabase, account }, input) => {
    const [{ data: order, error: orderError }, { data: layout, error: layoutError }] =
      await Promise.all([
        supabase
          .from("orders")
          .select("id,status,revision")
          .eq("id", input.order_id)
          .eq("account_id", account.id)
          .maybeSingle(),
        supabase
          .from("layouts")
          .select("id,name,slug,features,active,product_ranges(name)")
          .eq("id", input.layout_id)
          .eq("active", true)
          .maybeSingle(),
      ]);

    if (orderError || !order || order.status !== "draft") {
      return { ok: false as const, error: "This draft order is no longer available." };
    }
    if (layoutError || !layout) {
      return { ok: false as const, error: "The selected door style is no longer available." };
    }
    if (order.revision !== input.revision) {
      return { ok: false as const, error: conflictError };
    }

    const { data: lastItem, error: lineError } = await supabase
      .from("order_items")
      .select("line_number")
      .eq("order_id", order.id)
      .order("line_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lineError) {
      return { ok: false as const, error: "Could not prepare the order item." };
    }

    const { claimed, nextRevision } = await claimDraftRevision(
      supabase,
      account.id,
      order.id,
      order.revision,
    );
    if (!claimed) return { ok: false as const, error: conflictError };

    const { data: item, error: itemError } = await supabase
      .from("order_items")
      .insert({
        order_id: order.id,
        account_id: account.id,
        line_number: (lastItem?.line_number ?? 0) + 1,
        layout_id: layout.id,
        system: input.system,
        width_mm: input.width_mm,
        height_mm: input.height_mm,
        quantity: input.quantity,
        location: input.location,
        catalogue_snapshot: {
          layout_id: layout.id,
          layout_name: layout.name,
          layout_slug: layout.slug,
          range_name: layout.product_ranges?.name ?? "",
          layout_features: layout.features,
          system: input.system,
        },
      })
      .select("id")
      .single();

    if (itemError || !item) {
      return { ok: false as const, error: "Could not save the frame details. Please try again." };
    }

    await supabase.from("order_events").insert({
      order_id: order.id,
      account_id: account.id,
      event_type: "order_item_added",
      revision: nextRevision,
      metadata: { item_id: item.id, line_number: (lastItem?.line_number ?? 0) + 1 },
    });

    revalidateOrder(order.id);
    redirect(`/home/quotes/${order.id}/items/${item.id}/configure`);
  },
  { schema: CreateOrderItemSchema },
);

export const saveOrderItemConfigurationAction = authAction(
  async ({ supabase, account }, input) => {
    const { data: item, error: itemError } = await supabase
      .from("order_items")
      .select("id,system,width_mm,height_mm,quantity,location,orders!inner(status,revision)")
      .eq("id", input.item_id)
      .eq("order_id", input.order_id)
      .eq("account_id", account.id)
      .maybeSingle();

    if (itemError || !item || item.orders.status !== "draft") {
      return { ok: false as const, error: "This draft door is no longer available." };
    }
    if (item.orders.revision !== input.revision) {
      return { ok: false as const, error: conflictError };
    }

    const { claimed, nextRevision } = await claimDraftRevision(
      supabase,
      account.id,
      input.order_id,
      item.orders.revision,
    );
    if (!claimed) return { ok: false as const, error: conflictError };

    const configuration = {
      ...input.configuration,
      system: (item.system === "rehau" ? "rehau" : "eurocell") as "eurocell" | "rehau",
      frame: {
        width_mm: item.width_mm,
        height_mm: item.height_mm,
        quantity: item.quantity,
        location: item.location,
      },
    };
    const { error } = await supabase
      .from("order_items")
      .update({
        configuration,
        outside_drawing: input.outside_drawing || null,
        inside_drawing: input.inside_drawing || null,
      })
      .eq("id", item.id)
      .eq("account_id", account.id);

    if (error) {
      return { ok: false as const, error: "Could not save the door questions. Please try again." };
    }

    await supabase.from("order_events").insert({
      order_id: input.order_id,
      account_id: account.id,
      event_type: "order_item_configured",
      revision: nextRevision,
      metadata: { item_id: item.id },
    });

    revalidateOrder(input.order_id);
    redirect(`/print/orders/${input.order_id}`);
  },
  { schema: SaveOrderItemConfigurationSchema },
);

export const updateOrderItemAction = authAction(
  async ({ supabase, account }, input) => {
    const [{ data: item, error: itemError }, { data: layout, error: layoutError }] =
      await Promise.all([
        supabase
          .from("order_items")
          .select("id,layout_id,system,configuration,orders!inner(status,revision)")
          .eq("id", input.item_id)
          .eq("order_id", input.order_id)
          .eq("account_id", account.id)
          .maybeSingle(),
        supabase
          .from("layouts")
          .select("id,name,slug,features,active,product_ranges(name)")
          .eq("id", input.layout_id)
          .eq("active", true)
          .maybeSingle(),
      ]);

    if (itemError || !item || item.orders.status !== "draft") {
      return { ok: false as const, error: "This draft door is no longer available." };
    }
    if (layoutError || !layout) {
      return { ok: false as const, error: "The selected door style is no longer available." };
    }
    if (item.orders.revision !== input.revision) {
      return { ok: false as const, error: conflictError };
    }

    const { claimed, nextRevision } = await claimDraftRevision(
      supabase,
      account.id,
      input.order_id,
      item.orders.revision,
    );
    if (!claimed) return { ok: false as const, error: conflictError };

    const nextSystem = input.system ?? (item.system as "eurocell" | "rehau");
    const systemChanged = item.system !== nextSystem;
    const layoutChanged = item.layout_id !== input.layout_id || systemChanged;
    const parsedConfiguration = ConfigurationSchema.safeParse(item.configuration);
    const configuration = layoutChanged
      ? {}
      : parsedConfiguration.success
        ? {
            ...parsedConfiguration.data,
            system: nextSystem,
            frame: {
              width_mm: input.width_mm,
              height_mm: input.height_mm,
              quantity: input.quantity,
              location: input.location,
            },
          }
        : {};

    const { error } = await supabase
      .from("order_items")
      .update({
        layout_id: layout.id,
        system: nextSystem,
        width_mm: input.width_mm,
        height_mm: input.height_mm,
        quantity: input.quantity,
        location: input.location,
        configuration,
        catalogue_snapshot: {
          layout_id: layout.id,
          layout_name: layout.name,
          layout_slug: layout.slug,
          range_name: layout.product_ranges?.name ?? "",
          layout_features: layout.features,
          system: nextSystem,
        },
        ...(layoutChanged
          ? { outside_drawing: null, inside_drawing: null, manufacturing_snapshot: null }
          : {}),
      })
      .eq("id", item.id)
      .eq("account_id", account.id);

    if (error) {
      return { ok: false as const, error: "Could not update the door frame details." };
    }

    await supabase.from("order_events").insert({
      order_id: input.order_id,
      account_id: account.id,
      event_type: "order_item_updated",
      revision: nextRevision,
      metadata: { item_id: item.id, layout_changed: layoutChanged },
    });

    revalidateOrder(input.order_id);
    redirect(`/home/quotes/${input.order_id}/items/${item.id}/configure`);
  },
  { schema: UpdateOrderItemSchema },
);

export const duplicateOrderItemAction = authAction(
  async ({ supabase, account }, input) => {
    const [{ data: item, error: itemError }, { data: lastItem, error: lineError }] =
      await Promise.all([
        supabase
          .from("order_items")
          .select("*,orders!inner(status,revision)")
          .eq("id", input.item_id)
          .eq("order_id", input.order_id)
          .eq("account_id", account.id)
          .maybeSingle(),
        supabase
          .from("order_items")
          .select("line_number")
          .eq("order_id", input.order_id)
          .eq("account_id", account.id)
          .order("line_number", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (itemError || lineError || !item || item.orders.status !== "draft") {
      return { ok: false as const, error: "This draft door is no longer available." };
    }
    if (item.orders.revision !== input.revision) {
      return { ok: false as const, error: conflictError };
    }

    const { claimed, nextRevision } = await claimDraftRevision(
      supabase,
      account.id,
      input.order_id,
      item.orders.revision,
    );
    if (!claimed) return { ok: false as const, error: conflictError };

    const lineNumber = (lastItem?.line_number ?? 0) + 1;
    const location = item.location ? `${item.location} Copy`.slice(0, 120) : "";
    const parsedConfiguration = ConfigurationSchema.safeParse(item.configuration);
    const configuration = parsedConfiguration.success
      ? {
          ...parsedConfiguration.data,
          frame: { ...parsedConfiguration.data.frame, location },
        }
      : item.configuration;
    const { data: duplicate, error } = await supabase
      .from("order_items")
      .insert({
        order_id: input.order_id,
        account_id: account.id,
        line_number: lineNumber,
        layout_id: item.layout_id,
        system: item.system,
        width_mm: item.width_mm,
        height_mm: item.height_mm,
        quantity: item.quantity,
        location,
        configuration,
        catalogue_snapshot: item.catalogue_snapshot,
        manufacturing_snapshot: null,
        outside_drawing: null,
        inside_drawing: null,
      })
      .select("id")
      .single();

    if (error || !duplicate) {
      return { ok: false as const, error: "Could not duplicate this door." };
    }

    await supabase.from("order_events").insert({
      order_id: input.order_id,
      account_id: account.id,
      event_type: "order_item_duplicated",
      revision: nextRevision,
      metadata: {
        source_item_id: item.id,
        item_id: duplicate.id,
        line_number: lineNumber,
      },
    });

    revalidateOrder(input.order_id);
    redirect(`/home/quotes/${input.order_id}/items/${duplicate.id}/configure`);
  },
  { schema: OrderItemMutationSchema },
);

export const deleteOrderItemAction = authAction(
  async ({ supabase, account }, input) => {
    const { data: item, error: itemError } = await supabase
      .from("order_items")
      .select("id,line_number,location,orders!inner(status,revision)")
      .eq("id", input.item_id)
      .eq("order_id", input.order_id)
      .eq("account_id", account.id)
      .maybeSingle();

    if (itemError || !item || item.orders.status !== "draft") {
      return { ok: false as const, error: "This draft door is no longer available." };
    }
    if (item.orders.revision !== input.revision) {
      return { ok: false as const, error: conflictError };
    }

    const { claimed, nextRevision } = await claimDraftRevision(
      supabase,
      account.id,
      input.order_id,
      item.orders.revision,
    );
    if (!claimed) return { ok: false as const, error: conflictError };

    const { error } = await supabase
      .from("order_items")
      .delete()
      .eq("id", item.id)
      .eq("order_id", input.order_id)
      .eq("account_id", account.id);
    if (error) return { ok: false as const, error: "Could not delete this door." };

    await supabase.from("order_events").insert({
      order_id: input.order_id,
      account_id: account.id,
      event_type: "order_item_deleted",
      revision: nextRevision,
      metadata: { item_id: item.id, line_number: item.line_number, location: item.location },
    });

    revalidateOrder(input.order_id);
    redirect(`/home/quotes/${input.order_id}`);
  },
  { schema: OrderItemMutationSchema },
);

export const updateOrderStatusAction = authAction(
  async ({ supabase, account }, input) => {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,status,revision")
      .eq("id", input.order_id)
      .eq("account_id", account.id)
      .maybeSingle();

    if (orderError || !order) {
      return { ok: false as const, error: "This order is no longer available." };
    }
    if (order.status === input.status) return { ok: true as const };
    if (order.revision !== input.revision) {
      return { ok: false as const, error: conflictError };
    }
    if (!canTransitionOrder(order.status, input.status)) {
      return {
        ok: false as const,
        error: `This order cannot move from ${order.status.replace("_", " ")} to ${input.status.replace("_", " ")}.`,
      };
    }

    const now = new Date().toISOString();
    const nextRevision = order.revision + 1;
    const milestone =
      input.status === "issued"
        ? { issued_at: now }
        : input.status === "confirmed"
          ? { confirmed_at: now }
          : input.status === "in_production"
            ? { production_at: now }
            : input.status === "completed"
              ? { completed_at: now }
              : input.status === "cancelled"
                ? { cancelled_at: now }
                : {};
    const { data: updatedOrder, error } = await supabase
      .from("orders")
      .update({ status: input.status, revision: nextRevision, ...milestone })
      .eq("id", order.id)
      .eq("account_id", account.id)
      .eq("revision", input.revision)
      .select("id")
      .maybeSingle();
    if (error) {
      return { ok: false as const, error: "Could not update the order status." };
    }
    if (!updatedOrder) {
      return {
        ok: false as const,
        error: conflictError,
      };
    }

    await supabase.from("order_events").insert({
      order_id: order.id,
      account_id: account.id,
      event_type: "order_status_changed",
      previous_status: order.status,
      next_status: input.status,
      revision: nextRevision,
    });

    revalidateOrder(order.id);
    return { ok: true as const };
  },
  { schema: UpdateOrderStatusSchema },
);

export const deleteOrderAction = authAction(
  async ({ supabase, account }, input) => {
    if (account.role !== "admin") {
      return { ok: false as const, error: "Administrator access is required." };
    }
    if (input.confirmation !== input.order_number) {
      return { ok: false as const, error: "Type the exact order number to confirm deletion." };
    }

    const { data, error } = await supabase.rpc("delete_order_permanently", {
      target_order_id: input.order_id,
      confirmed_order_number: input.confirmation,
      deletion_reason: input.reason,
    });

    if (error || !data) {
      return {
        ok: false as const,
        error: error?.message || "This order is not eligible for permanent deletion.",
      };
    }

    revalidateTag("orders", "max");
    revalidatePath("/home");
    revalidatePath("/home/quotes");
    redirect("/home/quotes");
  },
  { schema: DeleteOrderSchema },
);
