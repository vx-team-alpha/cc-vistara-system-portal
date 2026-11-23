import { z } from "zod";

import { LinkableProviderSchema } from "@/server/auth/schemas";

export const UpdateNameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
});

const emailField = z.email("Enter a valid email address");

export const UpdateEmailSchema = z.object({
  email: emailField,
});

export const LinkIdentitySchema = z.object({
  provider: LinkableProviderSchema,
});

export const UnlinkIdentitySchema = z.object({
  identityId: z.string().min(1),
});

export type UpdateNameInput = z.infer<typeof UpdateNameSchema>;
export type UpdateEmailInput = z.infer<typeof UpdateEmailSchema>;
export type LinkIdentityInput = z.infer<typeof LinkIdentitySchema>;
export type UnlinkIdentityInput = z.infer<typeof UnlinkIdentitySchema>;
