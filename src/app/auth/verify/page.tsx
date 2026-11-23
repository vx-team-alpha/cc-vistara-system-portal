import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveNextPath } from "@/lib/auth/config";
import { createClient } from "@/lib/supabase/server";

import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Two-factor authentication" };

/**
 * The MFA (aal2) challenge.
 *
 * Reached from `postSignInDestination` in @/server/auth after a password is
 * accepted but the account has a verified second factor. The session at that
 * point is real but only `aal1` — RLS policies or gates that require `aal2` will
 * refuse it until this page completes.
 *
 * NOTE: MFA enrolment lives nowhere yet. This page verifies an EXISTING factor;
 * there is no UI to add one, so in practice no account reaches here until an
 * enrolment flow (normally under account settings) is built.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = resolveNextPath(params.next ?? null, "/home");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  // No session at all — nothing to step up. Send them to sign in first.
  if (!claims?.claims) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  const { data: factors, error } = await supabase.auth.mfa.listFactors();

  if (error) {
    redirect(
      `/auth/sign-in?error=${encodeURIComponent(
        "Could not load your authentication factors. Please sign in again.",
      )}`,
    );
  }

  // Only verified factors can answer a challenge; an unverified one is a
  // half-finished enrolment.
  const factor = factors?.totp?.[0];

  // Already at aal2, or nothing enrolled — either way there is no challenge to
  // present, so don't strand the user on a form they cannot complete.
  if (!factor) {
    redirect(next);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app
          {factor.friendly_name ? ` (${factor.friendly_name})` : ""}.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <VerifyForm factorId={factor.id} next={next} />
      </CardContent>
    </Card>
  );
}
