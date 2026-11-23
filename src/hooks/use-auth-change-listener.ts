"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useSupabase } from "./use-supabase";
import { USER_QUERY_KEY } from "./use-user";

type Props = {
  /**
   * Path prefixes that require a session. Passed in rather than read from a
   * module constant on purpose: hardcoding the list is what broke this in the
   * source, where it compared against `/home` and never matched the real,
   * locale-prefixed `/en/home`. Whoever mounts the listener knows the routing.
   */
  privatePathPrefixes: readonly string[];

  /** Where to send a user whose session ended while on a private page. */
  signedOutRedirect?: string;
};

/**
 * Reacts to auth events in this tab and in other tabs (Supabase broadcasts
 * across tabs over a BroadcastChannel).
 *
 * Every navigation here is a HARD one — `window.location`, not `router.push`.
 * That is intentional and not a perf oversight: the server holds the session in
 * cookies, and a soft navigation reuses the client router cache, so a signed-out
 * user could keep seeing server-rendered private content until something else
 * forced a request. A hard navigation makes the server re-read the cookies and
 * re-run the proxy.
 */
export function useAuthChangeListener({ privatePathPrefixes, signedOutRedirect = "/" }: Props) {
  const supabase = useSupabase();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // `pathname` changes on every client navigation. Reading it directly in the
  // effect's dependency array meant this effect tore down and rebuilt the
  // GoTrue subscription (and its BroadcastChannel listener, for cross-tab
  // events) on every single navigation — pure churn, and a small window on
  // each navigation where a cross-tab event could be missed between
  // unsubscribe and resubscribe. A ref lets the callback always read the
  // CURRENT pathname without pathname needing to be a dependency, so the
  // effect below only re-runs when something that actually changes the
  // subscription's behavior changes.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // `useUser` has refetching disabled, so this is the only thing that keeps
      // it honest.
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });

      const onPrivatePage = privatePathPrefixes.some(
        (prefix) => pathnameRef.current === prefix || pathnameRef.current.startsWith(`${prefix}/`),
      );

      if (event === "SIGNED_OUT") {
        // Leave a private page; reload a public one so any server-rendered
        // signed-in chrome (avatar, nav) re-renders as signed-out.
        if (onPrivatePage) {
          window.location.assign(signedOutRedirect);
        } else {
          window.location.reload();
        }

        return;
      }

      // A session that vanished without a SIGNED_OUT event — expired and
      // unrefreshable, or revoked elsewhere.
      //
      // Note there is deliberately no SIGNED_IN branch. supabase-js can re-emit
      // SIGNED_IN on tab focus, so reloading on it risks a reload loop; the
      // sign-in form navigates on success itself.
      if (!session && onPrivatePage) {
        window.location.assign(signedOutRedirect);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, privatePathPrefixes, signedOutRedirect, queryClient]);
}
