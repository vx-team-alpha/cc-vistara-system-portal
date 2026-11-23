"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { signInWithOAuthAction } from "@/server/auth";
import type { OAuthProvider } from "@/server/auth/schemas";

type OAuthProviderOption = {
  id: OAuthProvider;
  label: string;
};

/**
 * OAuth sign-in buttons.
 *
 * The action runs server-side and returns the provider URL rather than
 * redirecting: `signInWithOAuth` writes the PKCE code verifier as a cookie, and
 * that write only sticks in a Server Action / Route Handler. /auth/callback
 * reads that verifier back to complete the exchange, so starting the flow from
 * the browser client instead would put the verifier somewhere the callback
 * cannot use.
 *
 * The server passes only providers with configured credentials. This keeps
 * buttons for unconfigured local providers off the page and avoids starting
 * OAuth flows Supabase will reject.
 */
export function OAuthButtons({
  next,
  providers,
}: {
  next?: string;
  providers: OAuthProviderOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onClick = (provider: OAuthProvider) => {
    setError(null);
    setPendingProvider(provider);

    startTransition(async () => {
      try {
        const res = await signInWithOAuthAction(provider, next);

        if (!res.ok) {
          setError(res.error);
          setPendingProvider(null);
          return;
        }

        // Full navigation, not router.push — this leaves the app for the
        // provider's domain.
        window.location.assign(res.data.url);
      } catch {
        // Never surface the raw message: Next redacts Server Action errors in
        // production and replaces them with a digest.
        setError("Could not start sign-in. Please try again.");
        setPendingProvider(null);
      }
    });
  };

  return (
    <div className="grid gap-2">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          variant="outline"
          className="w-full"
          disabled={isPending}
          data-test={`oauth-${provider.id}-button`}
          onClick={() => onClick(provider.id)}
        >
          {pendingProvider === provider.id ? <Loader2 className="size-4 animate-spin" /> : null}
          Continue with {provider.label}
        </Button>
      ))}

      {error ? (
        <p role="status" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
