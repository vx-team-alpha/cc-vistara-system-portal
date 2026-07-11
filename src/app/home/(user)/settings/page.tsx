import { redirect } from "next/navigation";
import {
  getConfiguredLinkableProviders,
  getLinkableProviderOption,
  isKnownLinkableProvider,
} from "@/lib/auth/oauth-providers";
import { createClient } from "@/lib/supabase/server";
import type { LinkableProvider } from "@/server/auth/schemas";
import { UpdateNameCard } from "./_components/update-name-card";
import { UpdateEmailCard } from "./_components/update-email-card";
import { UpdatePasswordCard } from "./_components/update-password-card";
import { ConnectedAccountsCard, type ConnectedIdentity } from "./_components/connected-accounts-card";
import { DeleteAccountCard } from "./_components/delete-account-card";

function isLinkableProvider(provider: string): provider is LinkableProvider {
  return isKnownLinkableProvider(provider);
}

/**
 * `/home/settings` — already covered by `protectedPathPrefixes` in
 * `src/proxy.ts` (it matches on `/home`), but this re-checks anyway per the
 * convention in `src/app/home/page.tsx`: the proxy is an optimistic gate,
 * not the security boundary. Each card below additionally calls its own
 * `authAction`/`authRoute`, so this page-level check is a UX guard, not the
 * only thing standing between an anonymous caller and these mutations.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims?.claims) {
    redirect("/auth/sign-in?next=%2Fhome%2Fsettings");
  }

  const userId = claims.claims.sub;

  const [{ data: account }, { data: identitiesData }] = await Promise.all([
    supabase.from("accounts").select("id, name, email").eq("id", userId).maybeSingle(),
    supabase.auth.getUserIdentities(),
  ]);

  const identities: ConnectedIdentity[] = (identitiesData?.identities ?? [])
    .filter((identity) => isLinkableProvider(identity.provider))
    .map((identity) => ({
      identityId: identity.identity_id,
      provider: identity.provider as LinkableProvider,
    }));

  const linkableProviders = getConfiguredLinkableProviders();
  for (const identity of identities) {
    if (linkableProviders.some((provider) => provider.id === identity.provider)) {
      continue;
    }

    const provider = getLinkableProviderOption(identity.provider);
    if (provider) {
      linkableProviders.push(provider);
    }
  }

  const totalIdentityCount = identitiesData?.identities.length ?? 0;

  return (
    <div className="grid gap-6">
      <UpdateNameCard initialName={account?.name ?? ""} />
      <UpdateEmailCard currentEmail={account?.email ?? claims.claims.email ?? ""} />
      <UpdatePasswordCard />
      {linkableProviders.length > 0 ? (
        <ConnectedAccountsCard
          identities={identities}
          canUnlink={totalIdentityCount > 1}
          providers={linkableProviders}
        />
      ) : null}
      <DeleteAccountCard />
    </div>
  );
}
