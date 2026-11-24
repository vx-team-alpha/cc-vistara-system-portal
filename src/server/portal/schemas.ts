import { z } from "zod";
const website = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (!value) return true;
    try {
      return ["https:", "http:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Enter a full http or https website URL.");
const brandColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Choose a valid six-digit colour.");
const branding = {
  brand_name: z.string().trim().min(1, "Enter a brand name.").max(80),
  brand_logo_url: website.refine((value) => value.length > 0, "Upload a logo."),
  brand_phone: z
    .string()
    .trim()
    .min(1, "Enter a phone number.")
    .max(50)
    .regex(/^[0-9+().\-\s]+$/, "Enter a valid phone number."),
  brand_primary_color: brandColor,
  brand_background_color: brandColor,
  brand_text_color: brandColor,
};
export const WidgetSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(["door", "window"]),
  website_url: website,
  ...branding,
});
export const UpdateWidgetSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(80),
  website_url: website,
  enabled: z.boolean(),
  ...branding,
});
export const QuoteStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["new", "viewed", "contacted", "closed"]),
});
export const ConfigurationSchema = z.object({
  system: z.enum(["eurocell", "rehau", "doorco"]).default("eurocell"),
  frame: z
    .object({
      width_mm: z.number().int().min(300).max(2800),
      height_mm: z.number().int().min(1750).max(2500),
      quantity: z.number().int().min(1).max(999),
      location: z.string().trim().max(120),
    })
    .default({ width_mm: 900, height_mm: 2100, quantity: 1, location: "" }),
  style: z.string().max(80).default(""),
  design_id: z.union([z.uuid(), z.literal("")]).default(""),
  design_name: z.string().max(200).default(""),
  side_designs: z
    .record(z.string().max(200), z.uuid())
    .refine((v) => Object.keys(v).length <= 16)
    .default({}),
  picks: z
    .record(z.string().max(1000), z.uuid())
    .refine((v) => Object.keys(v).length <= 100)
    .default({}),
  texts: z
    .record(z.string().max(1000), z.string().max(200))
    .refine((v) => Object.keys(v).length <= 100)
    .default({}),
  particulars: z
    .array(
      z.object({
        question: z.string().max(200),
        original_name: z.string().max(200),
        section: z.string().max(200),
        answer: z.string().max(500),
      }),
    )
    .max(200)
    .default([]),
});
export type Configuration = z.infer<typeof ConfigurationSchema>;
export const PublicSubmissionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("view"), session_id: z.uuid() }),
  z.object({
    kind: z.literal("quote"),
    session_id: z.uuid(),
    layout_id: z.uuid(),
    name: z.string().trim().min(1).max(120),
    email: z.email().max(254),
    phone: z.string().trim().max(50),
    message: z.string().trim().max(2000),
    company: z.string().max(0),
    configuration: ConfigurationSchema.optional(),
  }),
]);
