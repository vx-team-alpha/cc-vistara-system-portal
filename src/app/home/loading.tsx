import { Loader2 } from "lucide-react";

/**
 * Shown while /home streams in. The page itself does a sequential
 * getClaims() verify + accounts RPC before it can render — both genuinely
 * depend on each other's result, so they cannot be parallelized away, and this
 * is what covers that wait instead of a blank screen.
 */
export default function HomeLoading() {
  return (
    <main className="flex min-h-svh items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading</span>
    </main>
  );
}
