"use client";

import { useQuery } from "@tanstack/react-query";

import { toJWTUserData, type JWTUserData } from "@/lib/auth/jwt-user";

import { useSupabase } from "./use-supabase";

export const USER_QUERY_KEY = ["supabase:user"] as const;

/**
 * The signed-in user on the client, or `null`.
 *
 * Deliberately inert: every refetch trigger is off. The server is the source of
 * truth — it re-reads the cookies on every navigation — and the only thing that
 * should invalidate this cache is an actual auth event, which
 * `use-auth-change-listener` handles. Turning `refetchOnWindowFocus` back on
 * just adds a GoTrue round-trip every time the user alt-tabs, and it can race
 * the listener into rendering a stale user for a frame.
 *
 * Seed it with `initialData` from a Server Component so the first client render
 * already knows who the user is and does not flash a signed-out state:
 *
 *   const user = await requireUser();          // in the page (server)
 *   <Profile initialUser={user} />             // client component
 *   const { data } = useUser(initialUser);     // inside it
 */
export function useUser(initialData?: JWTUserData | null) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: USER_QUERY_KEY,
    initialData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    queryFn: async (): Promise<JWTUserData | null> => {
      const { data, error } = await supabase.auth.getClaims();

      // No session is a legitimate answer, not a failure. Throwing here would
      // put the query in an error state that callers would have to special-case
      // to render a signed-out UI.
      if (error || !data?.claims) {
        return null;
      }

      return toJWTUserData(data.claims);
    },
  });
}
