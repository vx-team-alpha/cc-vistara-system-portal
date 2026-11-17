import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveNextPath } from "@/lib/auth/config";

/**
 * OAuth / PKCE landing point — the `?code=` flow.
 *
 * `signInWithOAuth` sends the user to the provider, the provider returns them
 * here with an auth code, and `exchangeCodeForSession` trades that code (plus
 * the PKCE verifier stored in a cookie) for a session.
 *
 * Sibling to `../confirm/route.ts`, which handles emailed `token_hash` links.
 *
 * The PKCE verifier lives in a cookie written when the flow started, so this
 * only works in the same browser that began it. A code pasted into another
 * browser fails by design — that is PKCE doing its job, not a bug.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolveNextPath(searchParams.get("next"));

  // The provider reports user-facing failures (consent denied, etc.) here.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");

  if (providerError) {
    redirect(`/auth/sign-in?error=${encodeURIComponent(providerError)}`);
  }

  if (!code) {
    redirect(
      `/auth/sign-in?error=${encodeURIComponent("Missing authorization code.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirect(
      `/auth/sign-in?error=${encodeURIComponent(
        "Could not complete sign-in. Please try again.",
      )}`,
    );
  }

  revalidateTag("settings-data", "max");

  redirect(next);
}
