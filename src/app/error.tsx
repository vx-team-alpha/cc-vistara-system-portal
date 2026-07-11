"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Root error boundary. Catches anything an app-route Server or Client
 * Component throws that isn't itself a `notFound()`/`redirect()` — without
 * this, an unhandled render error took down the whole route with Next's
 * default unstyled fallback and no recovery path.
 *
 * Must be a Client Component — Next requires it (the boundary needs to
 * `reset()` from the browser after the error, which a Server Component can't
 * do) — and it never renders `error.message` to the user: Next redacts
 * Server Component/Server Action error messages in production and replaces
 * them with a digest, so surfacing the raw message here would show a real
 * message in dev and something meaningless in prod. Log server-side (or to
 * an error-reporting service) instead of rendering it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <div className="grid gap-1">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          {error.digest ? `Reference: ${error.digest}` : "Please try again."}
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
