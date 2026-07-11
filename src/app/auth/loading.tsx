import { Loader2 } from "lucide-react";

/**
 * Shown while an /auth segment streams in. The Route Handlers under
 * /auth/confirm and /auth/callback do real work (verifyOtp, code exchange)
 * before redirecting, so this is what the user looks at during that hop.
 */
export default function AuthLoading() {
  return (
    <div className="flex min-h-40 items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
