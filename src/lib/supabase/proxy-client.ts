import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import type { Database } from "@/types/supabase";

import { getSupabaseClientKeys } from "./keys";

/**
 * The Supabase client for `src/proxy.ts`. This is the only client whose cookie
 * writes actually persist, which makes it the only place a session refresh can
 * stick. See `./server.ts` for the other half of that invariant.
 *
 * The dual write below is the load-bearing detail:
 *
 *   - `request.cookies.set` — so that anything later in THIS same pass (the
 *     proxy's own auth check, and the Server Components rendered downstream,
 *     which read cookies off the request) sees the refreshed token rather than
 *     the expired one it arrived with.
 *   - `response.cookies.set` — so the token reaches the browser as `Set-Cookie`
 *     and the NEXT request arrives already refreshed.
 *
 * Drop the request write and the current pass keeps using a token it has already
 * replaced. Drop the response write and the refresh is recomputed on every
 * single request, and rotation invalidates the refresh token the browser still
 * holds — sessions die at the TTL.
 *
 * @param response The response the proxy will return. Cookies are written into
 *   this exact object, so the caller MUST return this same instance — building a
 *   fresh `NextResponse` afterwards discards the refreshed session.
 */
export function createProxyClient(request: NextRequest, response: NextResponse) {
  const keys = getSupabaseClientKeys();

  return createServerClient<Database>(keys.url, keys.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}
