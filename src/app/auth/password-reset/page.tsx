import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { PasswordResetForm } from "./password-reset-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function PasswordResetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Set by /auth/password-reset/update when a recovery link is expired or
  // already used. Rendered as text; React escapes it.
  const { error } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to choose a new password.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <PasswordResetForm />

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/sign-in" className="underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
