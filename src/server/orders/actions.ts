"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { authAction } from "@/server/auth-wrapper";

import {
  CreateOrderItemSchema,
  CreateOrderSchema,
  SaveOrderItemConfigurationSchema,
} from "./schemas";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return value.trim().startsWith("+") ? `+${digits}` : digits;
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

export const createOrderItemAction = authAction(
  async ({ supabase, account }, input) => {
    const [{ data: order, error: orderError }, { data: layout, error: layoutError }] =
      await Promise.all([
        supabase
          .from("orders")
          .select("id,status")
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

    const { data: item, error: itemError } = await supabase
      .from("order_items")
      .insert({
        order_id: order.id,
        account_id: account.id,
        line_number: (lastItem?.line_number ?? 0) + 1,
        layout_id: layout.id,
        system: "eurocell",
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
          system: "eurocell",
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
      revision: 1,
      metadata: { item_id: item.id, line_number: (lastItem?.line_number ?? 0) + 1 },
    });

    revalidateTag("orders", "max");
    revalidatePath(`/home/quotes/${order.id}`);
    redirect(`/home/quotes/${order.id}/items/${item.id}/configure`);
  },
  { schema: CreateOrderItemSchema },
);

export const saveOrderItemConfigurationAction = authAction(
  async ({ supabase, account }, input) => {
    const { data: item, error: itemError } = await supabase
      .from("order_items")
      .select("id,width_mm,height_mm,quantity,location,orders!inner(status)")
      .eq("id", input.item_id)
      .eq("order_id", input.order_id)
      .eq("account_id", account.id)
      .maybeSingle();

    if (itemError || !item || item.orders.status !== "draft") {
      return { ok: false as const, error: "This draft door is no longer available." };
    }

    const configuration = {
      ...input.configuration,
      system: "eurocell" as const,
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
      revision: 1,
      metadata: { item_id: item.id },
    });

    revalidateTag("orders", "max");
    revalidatePath(`/home/quotes/${input.order_id}`);
    redirect(`/home/quotes/${input.order_id}`);
  },
  { schema: SaveOrderItemConfigurationSchema },
);
