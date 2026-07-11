"use client";

import { useAuthChangeListener } from "@/hooks/use-auth-change-listener";
import { protectedPathPrefixes } from "@/lib/auth/config";

/**
 * Installs the auth-change listener for the whole app.
 *
 * This is NOT a context provider — it renders `children` verbatim and exposes
 * nothing. It is a component only because hooks need one. Read `useUser()`
 * directly wherever you need the user; do not add a context here expecting
 * consumers to find it.
 *
 * Mount inside the react-query provider: the listener invalidates the user query
 * on auth events, so it needs a QueryClient above it.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthChangeListener({ privatePathPrefixes: protectedPathPrefixes });

  return <>{children}</>;
}
