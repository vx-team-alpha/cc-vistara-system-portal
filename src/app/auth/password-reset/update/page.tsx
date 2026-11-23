import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

/**
 * Where a recovery link lands, via /auth/callback (PKCE `?code=`) or
 * /auth/confirm (`token_hash`), either of which has already exchanged the token
 * for a real session.
 *
 * That session IS the authorization to set a new password — `updateUser` needs
 * one and there is no old password to check. So this page must be reachable only
 * with a session; without the gate below, anyone could open it directly, submit,
 * and get a confusing failure from the action instead of being told to request a
 * link.
 *
 * NOTE: /auth is not in `protectedPathPrefixes`, so the proxy does not gate this
 * — the check has to live here.
 */
export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect(
      `/auth/password-reset?error=${encodeURIComponent(
        "That link is invalid or has expired. Please request a new one.",
      )}`,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Pick something you haven&apos;t used before.</CardDescription>
      </CardHeader>

      <CardContent>
        <UpdatePasswordForm />
      </CardContent>
    </Card>
  );
}
