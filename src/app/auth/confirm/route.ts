import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { resolveNextPath } from "@/lib/auth/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Email link landing point — the `token_hash` flow.
 *
 * This is the target for every emailed link (sign-up confirmation, password
 * recovery, email change, magic link). The email templates in
 * `supabase/config.toml` must point here with `{{ .TokenHash }}`, not at the
 * default `{{ .ConfirmationURL }}`, which uses the older redirect flow.
 *
 * Sibling to `../callback/route.ts`, which handles the `?code=` (PKCE) flow used
 * by OAuth. Both end at a session; they differ only in what the provider hands
 * back.
 *
 * Note `verifyOtp` consumes the token — it is single-use, so a refresh of this
 * URL after success will fail. That is why we redirect away rather than render.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = resolveNextPath(searchParams.get("next"));

  if (!tokenHash || !type) {
    redirect(`/auth/sign-in?error=${encodeURIComponent("Invalid confirmation link.")}`);
  }

  const supabase = await createClient();

  // The cookies this writes DO persist: a Route Handler can set them, unlike a
  // Server Component. See lib/supabase/server.ts.
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    // Don't leak the raw GoTrue message — it distinguishes "expired" from
    // "already used" from "not found", which is a small oracle. One message.
    redirect(
      `/auth/sign-in?error=${encodeURIComponent(
        "That link is invalid or has expired. Please request a new one.",
      )}`,
    );
  }

  // A recovery link deliberately lands on the update-password form rather than
  // the app: verifyOtp has just created a real session, so without this the user
  // would be silently signed in and never asked for a new password.
  if (type === "recovery") {
    redirect("/auth/password-reset/update");
  }

  redirect(next);
}
