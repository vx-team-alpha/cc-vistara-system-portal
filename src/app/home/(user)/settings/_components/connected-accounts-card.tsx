"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { linkIdentityAction, unlinkIdentityAction } from "@/server/settings";
import type { LinkableProvider } from "@/server/auth/schemas";

export type ConnectedIdentity = {
  identityId: string;
  provider: LinkableProvider;
};

type LinkableProviderOption = {
  id: LinkableProvider;
  label: string;
};

/**
 * `identities`/`canUnlink` are computed server-side (see page.tsx) from
 * `supabase.auth.getUserIdentities()` — reading identities client-side would
 * need its own round trip, and the page already has a Supabase client from
 * the auth check it performs anyway.
 */
export function ConnectedAccountsCard({
  identities,
  canUnlink,
  providers,
}: {
  identities: ConnectedIdentity[];
  canUnlink: boolean;
  providers: LinkableProviderOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byProvider = new Map(identities.map((i) => [i.provider, i]));

  const onConnect = (provider: LinkableProvider) => {
    setError(null);
    setPendingId(provider);

    startTransition(async () => {
      try {
        const res = await linkIdentityAction({ provider });

        if (!res.ok) {
          setError(res.error);
          setPendingId(null);
          return;
        }

        window.location.assign(res.data.url);
      } catch {
        setError("Could not start connecting that account. Please try again.");
        setPendingId(null);
      }
    });
  };

  const onDisconnect = (identityId: string) => {
    setError(null);
    setPendingId(identityId);

    startTransition(async () => {
      try {
        const res = await unlinkIdentityAction({ identityId });

        if (!res.ok) {
          setError(res.error);
        }
      } catch {
        setError("Could not disconnect that account. Please try again.");
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected accounts</CardTitle>
        <CardDescription>Sign in faster by connecting another provider.</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-3">
        {providers.map((provider) => {
          const identity = byProvider.get(provider.id);
          const isRowPending = isPending && pendingId === (identity?.identityId ?? provider.id);

          return (
            <div key={provider.id} className="flex items-center justify-between gap-4">
              <div className="grid gap-0.5">
                <span className="text-sm font-medium">{provider.label}</span>
                <span className="text-xs text-muted-foreground">
                  {identity ? "Connected" : "Not connected"}
                </span>
              </div>

              {identity ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending || !canUnlink}
                  title={canUnlink ? undefined : "Connect another account before disconnecting this one."}
                  data-test={`disconnect-${provider.id}-button`}
                  onClick={() => onDisconnect(identity.identityId)}
                >
                  {isRowPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Disconnect
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  data-test={`connect-${provider.id}-button`}
                  onClick={() => onConnect(provider.id)}
                >
                  {isRowPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Connect
                </Button>
              )}
            </div>
          );
        })}

        {error ? (
          <p role="status" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
