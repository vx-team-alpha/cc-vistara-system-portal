import { z } from "zod";

import { ConfigurationSchema } from "@/server/portal/schemas";

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

export const CreateOrderSchema = z.object({
  customer_name: requiredText("Customer name", 120),
  phone: requiredText("Phone", 50).regex(/^[0-9+().\-\s]+$/, "Enter a valid phone number."),
  address: requiredText("Address", 240),
  city: requiredText("City", 120),
  state: requiredText("State", 120),
  zip_code: requiredText("ZIP code", 20),
  delivery_date: z
    .string()
    .trim()
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date."),
  note: z.string().trim().max(4000, "Note is too long."),
});

export const OrderListSchema = z.object({
  status: z
    .enum(["all", "draft", "issued", "confirmed", "in_production", "completed", "cancelled"])
    .default("all"),
  query: z.string().trim().max(120).default(""),
  page: z.number().int().min(1).max(10000).default(1),
});

export const CreateOrderItemSchema = z.object({
  order_id: z.uuid(),
  layout_id: z.uuid(),
  width_mm: z.coerce
    .number({ error: "Enter the frame width." })
    .int("Width must be a whole millimetre.")
    .min(300, "Width must be at least 300 mm.")
    .max(2800, "Width cannot exceed 2800 mm."),
  height_mm: z.coerce
    .number({ error: "Enter the frame height." })
    .int("Height must be a whole millimetre.")
    .min(1750, "Height must be at least 1750 mm.")
    .max(2500, "Height cannot exceed 2500 mm."),
  quantity: z.coerce
    .number({ error: "Enter a quantity." })
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1.")
    .max(999, "Quantity cannot exceed 999."),
  location: z.string().trim().max(120, "Location is too long."),
});

export const SaveOrderItemConfigurationSchema = z.object({
  order_id: z.uuid(),
  item_id: z.uuid(),
  configuration: ConfigurationSchema,
  outside_drawing: z.string().max(2_000_000).default(""),
  inside_drawing: z.string().max(2_000_000).default(""),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type CreateOrderItemInput = z.infer<typeof CreateOrderItemSchema>;
export type OrderListInput = z.infer<typeof OrderListSchema>;
