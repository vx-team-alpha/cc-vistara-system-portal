import { z } from "zod";

/**
 * Shared by the forms (for UX) and the actions (as the security boundary). One
 * schema, two consumers — see the `react-form-builder` skill.
 *
 * `MIN_PASSWORD_LENGTH` mirrors `minimum_password_length` in
 * `supabase/config.toml`. If the two drift, GoTrue rejects a password the form
 * already accepted and the user gets a server error where they should have got
 * inline field validation. Change both together.
 */
export const MIN_PASSWORD_LENGTH = 6;

const emailField = z.email("Enter a valid email address");

const passwordField = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);

export const SignInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

export const SignUpSchema = z
  .object({
    email: emailField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  // Attach the mismatch to confirmPassword so it renders under that field
  // rather than as a form-level banner.
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const RequestPasswordResetSchema = z.object({
  email: emailField,
});

export const MagicLinkSchema = z.object({
  email: emailField,
});

export const UpdatePasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const VerifyMfaSchema = z.object({
  factorId: z.string().min(1),
  code: z.string().length(6, "Enter the 6-digit code").regex(/^\d+$/, "The code is digits only"),
});

/** Providers we actually have buttons for. Keeps an arbitrary string out of signInWithOAuth. */
export const OAuthProviderSchema = z.enum(["google", "github"]);

/**
 * Providers offered as *account connections* in settings, distinct from
 * `OAuthProviderSchema` (initial sign-in). `linkIdentity`/`unlinkIdentity`
 * accept any provider `signInWithOAuth` does, but this app only surfaces
 * Google and LinkedIn as connect targets on the settings page.
 */
export const LinkableProviderSchema = z.enum(["google", "linkedin_oidc"]);

export type SignInInput = z.infer<typeof SignInSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>;
export type MagicLinkInput = z.infer<typeof MagicLinkSchema>;
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;
export type VerifyMfaInput = z.infer<typeof VerifyMfaSchema>;
export type OAuthProvider = z.infer<typeof OAuthProviderSchema>;
export type LinkableProvider = z.infer<typeof LinkableProviderSchema>;
