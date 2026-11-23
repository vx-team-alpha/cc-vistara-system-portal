"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * The react-query client for the app.
 *
 * The client is created in `useState` rather than at module scope on purpose. A
 * module-level QueryClient is shared across every request on the server, which
 * leaks one user's cached data into another user's render. `useState` gives each
 * client render its own, and each SSR pass a fresh one.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, an immediate refetch on the client for data the server
            // just sent is pure waste. A short window covers the handoff.
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
