import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while an /auth segment streams in. The Route Handlers under
 * /auth/confirm and /auth/callback do real work (verifyOtp, code exchange)
 * before redirecting, so this is what the user looks at during that hop.
 */
export default function AuthLoading() {
  return (
    <div className="flex min-h-40 items-center justify-center" role="status" aria-live="polite">
      <div aria-hidden="true" className="w-full max-w-sm space-y-4 px-6"><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
