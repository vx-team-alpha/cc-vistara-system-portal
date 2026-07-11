import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getSupabaseClientKeys, getSupabaseSecretKey } from "./keys";

/**
 * A service-role client. **This bypasses RLS entirely** — every policy in
 * `supabase/schemas/900-rls.sql` is inert for queries made through it, so it is
 * the caller's job to scope by account id by hand.
 *
 * Reach for `createClient()` from `./server.ts` instead unless you specifically
 * need to act outside any one user's permissions (webhooks, admin tooling,
 * background work spanning multiple accounts).
 *
 * The auth options matter: this client must never participate in a user session.
 * `persistSession` would have it write session state into a server-shared
 * store, and `autoRefreshToken` would start a timer that keeps the process
 * alive. There is no user here — only a static key.
 */
export function getSupabaseAdminClient() {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[supabase/admin] service-role client created — RLS is bypassed for these queries.",
    );
  }

  return createClient<Database>(getSupabaseClientKeys().url, getSupabaseSecretKey(), {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false,
    },
  });
}
