import { cache } from "react";

import { toJWTUserData } from "@/lib/auth/jwt-user";
import { createClient } from "@/lib/supabase/server";

import { AccountNotFoundError, UnauthorizedError } from "./errors";
import type { Account, AuthContext } from "./types";

/**
 * Authenticate the caller and load their account.
 *
 * Wrapped in React `cache()` so that multiple calls within the same server request
 * lifecycle (layout, page, server actions, nested components) share the same single
 * database query and auth verification without redundant RPC round-trips.
 */
export const resolveAuthContext = cache(async (): Promise<AuthContext> => {
  const supabase = await createClient();

  // `getClaims()` verifies the access token locally against the project's JWKS
  // (ES256 — see `signing_keys_path` in supabase/config.toml) rather than asking
  // GoTrue who the caller is, which `getUser()` would do on every single action.
  //
  // It is still safe to trust: the signature is checked against the published
  // public key, so a forged or tampered token fails here. What it does NOT catch
  // is a token revoked mid-TTL — a signed-out session stays verifiable until it
  // expires. That is the trade being made, and it is the same one the Supabase
  // docs describe for asymmetric keys.
  const { data, error: authError } = await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    throw new UnauthorizedError();
  }

  const user = toJWTUserData(data.claims);

  // accounts.id IS the auth user id, so this could be `.eq("id", user.id)`.
  // It goes through the RPC anyway because that function is `security definer`
  // and returns the row regardless of how the SELECT grant is scoped — the
  // query keeps working if a future column is withheld from `authenticated`.
  const { data: account, error: accountError } = await supabase
    .rpc("current_account")
    .maybeSingle();

  if (accountError || !account) {
    throw new AccountNotFoundError();
  }

  return { user, account, supabase };
});

/**
 * Cached helper that returns the caller's full account row from `public.accounts`.
 * Reuses `resolveAuthContext()`, guaranteeing zero duplicate database queries per request.
 */
export const getCurrentAccount = cache(async (): Promise<Account> => {
  const { account } = await resolveAuthContext();
  return account;
});
