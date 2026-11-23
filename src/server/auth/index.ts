"use server";

import type { User } from "@supabase/supabase-js";
import { headers } from "next/headers";

import { resolveNextPath } from "@/lib/auth/config";
import { isOAuthProviderConfigured } from "@/lib/auth/oauth-providers";
import { createClient } from "@/lib/supabase/server";

import {
  MagicLinkSchema,
  OAuthProviderSchema,
  RequestPasswordResetSchema,
  SignInSchema,
  UpdatePasswordSchema,
  VerifyMfaSchema,
} from "./schemas";

/**
 * Public auth actions.
 *
 * These deliberately do NOT use `authAction` from `@/server/auth-wrapper` — that
 * wrapper throws `UnauthorizedError` for anonymous callers by design, and every
 * action here is called by someone who is not signed in yet. Per the
 * `server-action-builder` skill, public actions are plain `"use server"`
 * functions that parse their own schema.
 *
 * The schema parse is not a formality: a Server Action compiles to a public POST
 * endpoint whose arguments are attacker-controlled, whether or not any form
 * points at it.
 *
 * Every action returns a result object rather than calling `redirect()`.
 * `redirect()` works by throwing, so a `try`/`catch` in the handler swallows it —
 * and callers here need to distinguish "signed in, go to /home" from "signed in
 * but needs a second factor, go to /auth/verify".
 */

type ActionFailure = {
  ok: false;
  /** Safe to render. Never a raw provider message unless it is user-actionable. */
  error: string;
  /** When set, the form should attach the error to this field rather than a banner. */
  field?: string;
};

/** An action that returns data on success. */
type ActionResult<T> = { ok: true; data: T } | ActionFailure;

/** An action that returns nothing on success. */
type ActionOk = { ok: true } | ActionFailure;

async function getOrigin(): Promise<string> {
  const h = await headers();

  // `origin` is present on Server Action POSTs; fall back to host for GETs and
  // for runtimes that strip it.
  const origin = h.get("origin");
  if (origin) return origin;

  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  return `${proto}://${host}`;
}

/**
 * Where to send a user immediately after their password is accepted.
 *
 * A password alone is `aal1`. If the account has a verified second factor, it
 * must go to /auth/verify before it can be treated as fully authenticated.
 * Skipping this check is how an MFA-enabled account silently degrades to
 * password-only.
 *
 * This is a pure function of the sign-in/sign-up response, not a network call.
 * `signInWithPassword`/`signUp` already return `data.user.factors` — the same
 * list `auth.mfa.getAuthenticatorAssuranceLevel()` would derive its `nextLevel`
 * from — so there is nothing left to fetch. (In this project's supabase-js
 * version the no-argument form of `getAuthenticatorAssuranceLevel()` is itself
 * already local — it reads the cached session rather than calling GoTrue — so
 * this change does not remove a network round-trip that existed before; what
 * it removes is a second `createClient()` per sign-in/sign-up, see below.)
 *
 * A false negative here is not possible: the factors list comes from the same
 * response the session itself was minted from. A false positive (routing to
 * /auth/verify when no step-up is actually needed) self-corrects — that page
 * redirects straight through when it finds no verified TOTP factor.
 */
function postSignInDestination(next: string, user: User | null | undefined): string {
  const hasVerifiedFactor = user?.factors?.some((factor) => factor.status === "verified") ?? false;

  return hasVerifiedFactor ? `/auth/verify?next=${encodeURIComponent(next)}` : next;
}

export async function signInAction(
  raw: unknown,
  rawNext?: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = SignInSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // One message for both "no such user" and "wrong password". Distinguishing
    // them turns this form into an account-enumeration oracle.
    return { ok: false, error: "Invalid email or password." };
  }

  // `next` comes off the URL the proxy built when it bounced the user here, so
  // it is attacker-controlled and re-sanitised rather than trusted.
  const next = resolveNextPath(typeof rawNext === "string" ? rawNext : null, "/home");

  return { ok: true, data: { redirectTo: postSignInDestination(next, data.user) } };
}

export async function signUpAction(
  _raw: unknown,
): Promise<ActionResult<{ redirectTo: string | null; needsEmailConfirmation: boolean }>> {
  // Public self-serve sign-up is closed. New accounts are created from Admin →
  // All users (`createUserAction`), which uses the service-role admin API.
  return {
    ok: false,
    error: "Sign-up is disabled. Ask an administrator to create your account.",
  };
}

export async function requestPasswordResetAction(raw: unknown): Promise<ActionOk> {
  const parsed = RequestPasswordResetSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email address.", field: "email" };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  // /auth/callback for the same reason as signUp: the PKCE link arrives as
  // `?code=`. The recovery session it establishes is what lets
  // updatePasswordAction call updateUser without the old password.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/password-reset/update")}`,
  });

  // Deliberately ignore the error and always report success. Reporting "no such
  // user" here would let anyone test which emails have accounts.
  return { ok: true };
}

export async function signInWithMagicLinkAction(
  raw: unknown,
  rawNext?: unknown,
): Promise<ActionOk> {
  const parsed = MagicLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email address.", field: "email" };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const next = resolveNextPath(typeof rawNext === "string" ? rawNext : null, "/home");

  // /auth/confirm, not /auth/callback: the magic_link email template hardcodes
  // that path with `token_hash` (see supabase/templates/magic_link.html).
  // `emailRedirectTo` only supplies the `next` the template forwards as
  // `{{ .RedirectTo }}` — same relationship as signUpAction's emailRedirectTo.
  //
  // Deliberately ignore the error and always report success, same reasoning as
  // requestPasswordResetAction: distinguishing "no such account" here turns
  // this into an account-enumeration oracle.
  await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  return { ok: true };
}

export async function updatePasswordAction(raw: unknown): Promise<ActionOk> {
  const parsed = UpdatePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  const supabase = await createClient();

  // This relies on the recovery session that /auth/confirm just established.
  // `updateUser` fails without one, which is the guard: you cannot change a
  // password without either the emailed link or an existing session.
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { ok: false, error: error.message, field: "password" };
  }

  return { ok: true };
}

export async function verifyMfaAction(raw: unknown): Promise<ActionOk> {
  const parsed = VerifyMfaSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Enter the 6-digit code.", field: "code" };
  }

  const supabase = await createClient();

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: parsed.data.factorId,
  });

  if (challengeError || !challenge) {
    return { ok: false, error: "Could not start verification. Please try again." };
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId: parsed.data.factorId,
    challengeId: challenge.id,
    code: parsed.data.code,
  });

  if (error) {
    return { ok: false, error: "That code is incorrect or has expired.", field: "code" };
  }

  return { ok: true };
}

export async function signOutAction(): Promise<ActionOk> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return { ok: true };
}

export async function signInWithOAuthAction(
  rawProvider: unknown,
  rawNext?: unknown,
): Promise<ActionResult<{ url: string }>> {
  const parsed = OAuthProviderSchema.safeParse(rawProvider);
  if (!parsed.success) {
    return { ok: false, error: "Unsupported sign-in provider." };
  }

  if (!isOAuthProviderConfigured(parsed.data)) {
    return { ok: false, error: "That sign-in provider is not configured." };
  }

  const next = resolveNextPath(typeof rawNext === "string" ? rawNext : null, "/home");
  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: parsed.data,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  // Running this server-side is what lets the PKCE code verifier be written as a
  // cookie here; /auth/callback reads it back to complete the exchange.
  if (error || !data.url) {
    return { ok: false, error: "Could not start sign-in. Please try again." };
  }

  return { ok: true, data: { url: data.url } };
}
