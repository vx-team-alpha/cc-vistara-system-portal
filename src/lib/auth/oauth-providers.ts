import "server-only";

import type { LinkableProvider, OAuthProvider } from "@/server/auth/schemas";

type ProviderCredentials = {
  clientIdEnv: string;
  secretEnv: string;
};

export type OAuthProviderOption = {
  id: OAuthProvider;
  label: string;
};

export type LinkableProviderOption = {
  id: LinkableProvider;
  label: string;
};

const OAUTH_PROVIDERS: (OAuthProviderOption & ProviderCredentials)[] = [
  {
    id: "google",
    label: "Google",
    clientIdEnv: "SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID",
    secretEnv: "SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET",
  },
  {
    id: "github",
    label: "GitHub",
    clientIdEnv: "SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID",
    secretEnv: "SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET",
  },
];

const LINKABLE_PROVIDERS: (LinkableProviderOption & ProviderCredentials)[] = [
  {
    id: "google",
    label: "Google",
    clientIdEnv: "SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID",
    secretEnv: "SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET",
  },
  {
    id: "linkedin_oidc",
    label: "LinkedIn",
    clientIdEnv: "SUPABASE_AUTH_EXTERNAL_LINKEDIN_OIDC_CLIENT_ID",
    secretEnv: "SUPABASE_AUTH_EXTERNAL_LINKEDIN_OIDC_SECRET",
  },
];

function hasValue(key: string): boolean {
  return (process.env[key]?.trim().length ?? 0) > 0;
}

function hasProviderKeys(provider: ProviderCredentials): boolean {
  return hasValue(provider.clientIdEnv) && hasValue(provider.secretEnv);
}

function stripCredentials<T extends { id: string; label: string }>(
  provider: T,
): Pick<T, "id" | "label"> {
  return { id: provider.id, label: provider.label };
}

export function getConfiguredOAuthProviders(): OAuthProviderOption[] {
  return OAUTH_PROVIDERS.filter(hasProviderKeys).map(stripCredentials);
}

export function getConfiguredLinkableProviders(): LinkableProviderOption[] {
  return LINKABLE_PROVIDERS.filter(hasProviderKeys).map(stripCredentials);
}

export function isOAuthProviderConfigured(provider: OAuthProvider): boolean {
  return OAUTH_PROVIDERS.some((p) => p.id === provider && hasProviderKeys(p));
}

export function isLinkableProviderConfigured(provider: LinkableProvider): boolean {
  return LINKABLE_PROVIDERS.some((p) => p.id === provider && hasProviderKeys(p));
}

export function isKnownLinkableProvider(provider: string): provider is LinkableProvider {
  return LINKABLE_PROVIDERS.some((p) => p.id === provider);
}

export function getLinkableProviderOption(
  provider: LinkableProvider,
): LinkableProviderOption | null {
  const option = LINKABLE_PROVIDERS.find((p) => p.id === provider);

  return option ? stripCredentials(option) : null;
}
