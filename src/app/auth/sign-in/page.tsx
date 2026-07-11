import Link from "next/link";
import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { resolveNextPath } from "@/lib/auth/config";
import { getConfiguredOAuthProviders } from "@/lib/auth/oauth-providers";
import { OAuthButtons } from "../_components/oauth-buttons";
import { SignInMethods } from "./sign-in-methods";

export const metadata: Metadata = { title: "Sign in" };

/**
 * `searchParams` is a promise in Next 16 and must be awaited.
 *
 * Both values here come off the URL and are attacker-controlled:
 *   - `next`  — sanitised via resolveNextPath, or it is an open redirect.
 *   - `error` — rendered as text only. React escapes it, so it cannot inject
 *     markup, but it must never be fed to dangerouslySetInnerHTML.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = resolveNextPath(params.next ?? null, "/home");
  const oauthProviders = getConfiguredOAuthProviders();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back. Enter your details to continue.</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6">
        {params.error ? (
          <p role="alert" className="text-sm text-destructive">
            {params.error}
          </p>
        ) : null}

        <SignInMethods next={next} />

        {oauthProviders.length > 0 ? (
          <>
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <OAuthButtons next={next} providers={oauthProviders} />
          </>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" className="underline underline-offset-4">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
