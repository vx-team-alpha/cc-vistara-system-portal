import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { getSupabaseClientKeys } from "./keys";

/**
 * The Supabase client for Client Components.
 *
 * `createBrowserClient` memoises internally, so calling this repeatedly returns
 * the same underlying client rather than opening a new connection each time.
 */
export function getSupabaseBrowserClient() {
  const keys = getSupabaseClientKeys();

  return createBrowserClient<Database>(keys.url, keys.anonKey);
}
