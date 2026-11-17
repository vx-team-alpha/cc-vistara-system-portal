"use server";

import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { isLinkableProviderConfigured } from "@/lib/auth/oauth-providers";
import { authAction } from "@/server/auth-wrapper";
import {
  LinkIdentitySchema,
  UnlinkIdentitySchema,
  UpdateEmailSchema,
  UpdateNameSchema,
} from "./schemas";

/**
 * Authenticated account-settings actions.
 *
 * Every export here is wrapped in `authAction`, so each is independently
 * gated behind `resolveAuthContext()` — schema parse, then session, then
 * account load — regardless of what the settings page itself renders. See
 * `src/server/AGENTS.md`.
 *
 * Same result-object convention as `@/server/auth`: return `{ ok }` rather
 * than throwing, since these are called directly from client forms that need
 * to distinguish field errors from form-level errors.
 */

type ActionFailure = {
  ok: false;
  error: string;
  field?: string;
};

type ActionResult<T> = { ok: true; data: T } | ActionFailure;
type ActionOk = { ok: true } | ActionFailure;

async function getOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;

  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export const updateNameAction = authAction(
  async ({ account, supabase }, input): Promise<ActionOk> => {
    const { error } = await supabase
      .from("accounts")
      .update({ name: input.name })
      .eq("id", account.id);

    if (error) {
      return { ok: false, error: "Could not update your name. Please try again." };
    }

    revalidateTag("settings-data", "max");
    revalidatePath("/home/settings");
    return { ok: true };
  },
  { schema: UpdateNameSchema },
);

/**
 * Starts an email change. `accounts.email` is not directly writable (see
 * `999-grants.sql`) — it only updates once `handle_user_email_change` fires
 * after GoTrue confirms ownership of the new address, which is why this
 * returns before the account row reflects the new email.
 */
export const updateEmailAction = authAction(
  async ({ supabase }, input): Promise<ActionOk> => {
    const origin = await getOrigin();

    const { error } = await supabase.auth.updateUser(
      { email: input.email },
      {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/home/settings")}`,
      },
    );

    if (error) {
      return { ok: false, error: error.message, field: "email" };
    }

    return { ok: true };
  },
  { schema: UpdateEmailSchema },
);

/**
 * Starts linking an additional OAuth identity to the signed-in user.
 * Distinct from `signInWithOAuthAction` (`@/server/auth`), which starts a
 * fresh sign-in rather than attaching a provider to the current session —
 * see `supabase.auth.linkIdentity` vs `signInWithOAuth`. Requires
 * `enable_manual_linking = true` in supabase/config.toml.
 */
export const linkIdentityAction = authAction(
  async ({ supabase }, input): Promise<ActionResult<{ url: string }>> => {
    if (!isLinkableProviderConfigured(input.provider)) {
      return { ok: false, error: "That account provider is not configured." };
    }

    const origin = await getOrigin();

    const { data, error } = await supabase.auth.linkIdentity({
      provider: input.provider,
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/home/settings")}`,
      },
    });

    if (error || !data.url) {
      return { ok: false, error: "Could not start connecting that account. Please try again." };
    }

    return { ok: true, data: { url: data.url } };
  },
  { schema: LinkIdentitySchema },
);

export const unlinkIdentityAction = authAction(
  async ({ supabase }, input): Promise<ActionOk> => {
    const { data: identitiesData, error: identitiesError } = await supabase.auth.getUserIdentities();

    if (identitiesError || !identitiesData) {
      return { ok: false, error: "Could not load connected accounts. Please try again." };
    }

    const identity = identitiesData.identities.find((i) => i.identity_id === input.identityId);

    if (!identity) {
      return { ok: false, error: "That connected account was not found." };
    }

    // unlinkIdentity refuses to remove the caller's only identity — otherwise
    // they would lock themselves out with no remaining way to sign in.
    if (identitiesData.identities.length < 2) {
      return { ok: false, error: "Connect another account before disconnecting this one." };
    }

    const { error } = await supabase.auth.unlinkIdentity(identity);

    if (error) {
      return { ok: false, error: "Could not disconnect that account. Please try again." };
    }

    revalidateTag("settings-data", "max");
    revalidatePath("/home/settings");
    return { ok: true };
  },
  { schema: UnlinkIdentitySchema },
);
