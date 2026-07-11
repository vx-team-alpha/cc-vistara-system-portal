"use client";

import { useMemo } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * The browser Supabase client, stable across re-renders.
 *
 * `createBrowserClient` memoises internally, so the `useMemo` is belt-and-braces
 * rather than load-bearing — but it keeps the reference identity stable, which
 * matters when the client is a dependency of a `useEffect` (see
 * `use-auth-change-listener`).
 */
export function useSupabase() {
  return useMemo(() => getSupabaseBrowserClient(), []);
}
