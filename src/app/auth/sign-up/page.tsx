import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getConfiguredOAuthProviders } from "@/lib/auth/oauth-providers";
import { OAuthButtons } from "../_components/oauth-buttons";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUpPage() {
  await connection();

  const oauthProviders = getConfiguredOAuthProviders();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Get started in a couple of steps.</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6">
        <SignUpForm />

        {oauthProviders.length > 0 ? (
          <>
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <OAuthButtons providers={oauthProviders} />
          </>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
