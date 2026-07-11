import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { getSupabaseClientKeys } from "./keys";

/**
 * The RLS-bound Supabase client for Server Components, Server Actions, and Route
 * Handlers. Uses the anon key and the caller's cookies, so every query it makes
 * runs as that user.
 *
 * Wrapped in `React.cache` so every call within the same request returns the
 * SAME client instance instead of building a fresh one. `resolveAuthContext`
 * alone calls this at least once per authenticated action, on top of whatever
 * a page or handler calls directly — without memoization, a single request
 * that touches auth twice builds two clients and re-awaits `cookies()` twice
 * for no reason. Safe to share: nothing here is per-call state, only
 * per-request state (the cookie jar), which is exactly what `cache()` scopes
 * to. In a Route Handler this may fall back to building a fresh client per
 * call — Next does not guarantee `cache()` dedupes there the way it does for
 * Server Components — which only degrades to today's behavior, never to
 * incorrectness.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();
  const keys = getSupabaseClientKeys();

  return createServerClient<Database>(keys.url, keys.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // INVARIANT: do not "fix" this empty catch.
          //
          // Reading an expired access token makes @supabase/ssr refresh it as a
          // side effect, and it then tries to persist the new token here. A
          // Server Component cannot set cookies, so `cookieStore.set` throws
          // exactly that case.
          //
          // Swallowing it is correct ONLY because `src/proxy.ts` refreshes the
          // session on every matched request and writes the result to the real
          // response. The proxy is what makes a refresh stick; this catch only
          // stops a Server Component from crashing on a write it was never
          // allowed to make.
          //
          // Delete the proxy, or drop a path from its matcher, and sessions
          // start dying silently at the token TTL — which looks fine locally and
          // breaks in production an hour later.
        }
      },
    },
  });
});
