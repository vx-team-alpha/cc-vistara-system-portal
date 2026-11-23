import { portalStyles as s } from "@/components/portal/ui";
import {
  getConfiguredLinkableProviders,
  getLinkableProviderOption,
  isKnownLinkableProvider,
} from "@/lib/auth/oauth-providers";
import type { LinkableProvider } from "@/server/auth/schemas";
import { getSettingsData } from "@/server/settings/data";

import {
  ConnectedAccountsCard,
  type ConnectedIdentity,
} from "./_components/connected-accounts-card";
import { DeleteAccountCard } from "./_components/delete-account-card";
import { UpdateEmailCard } from "./_components/update-email-card";
import { UpdateNameCard } from "./_components/update-name-card";
import { UpdatePasswordCard } from "./_components/update-password-card";

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
  const { account, user, identities: identitiesData } = await getSettingsData();

  const identities: ConnectedIdentity[] = identitiesData
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

  const totalIdentityCount = identitiesData.length;

  return (
    <div className={s.settingsStack}>
      <UpdateNameCard initialName={account.name ?? ""} />
      <UpdateEmailCard currentEmail={account.email ?? user.email ?? ""} />
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
