/**
 * Auth routing config.
 *
 * These live in one place rather than inline in `src/proxy.ts` on purpose: the
 * source this was ported from hardcoded `/auth/sign-in` inside its guard, which
 * meant moving the sign-in page silently broke every redirect. Change a path
 * here and the proxy follows.
 */

export const authPaths = {
  /** Where an unauthenticated caller is sent, with `?next=` appended. */
  signIn: "/auth/sign-in",
} as const;

/**
 * Path prefixes the proxy requires a session for. Matched with `startsWith`, so
 * `/home` also covers `/home/settings`.
 *
 * NOTE: nothing is served under these prefixes yet — the app currently has only
 * `/`. Add prefixes here as protected routes land.
 *
 * This gate is an optimistic check, not the security boundary. Next's own docs
 * warn that a matcher change can silently drop proxy coverage (including for
 * Server Functions, which are POSTs to the page's own route), so authorization
 * still belongs in `@/server/auth-wrapper` on every action and route handler.
 * This only spares a signed-out user from rendering a page they cannot use.
 */
export const protectedPathPrefixes: readonly string[] = ["/home"];

export function isProtectedPath(pathname: string): boolean {
  return protectedPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Sanitise a `next=` value taken from the URL before redirecting to it.
 *
 * `next` is attacker-controlled — it rides in on a link — so echoing it into a
 * redirect unchecked is an open redirect: `/auth/sign-in?next=https://evil.tld`
 * would bounce a freshly-authenticated user straight off-site, and the URL bar
 * would have shown your domain the whole way. Phishing gets a lot easier.
 *
 * Only same-origin absolute paths survive. Rejected:
 *   - `https://evil.tld`  — absolute URL
 *   - `//evil.tld`        — protocol-relative; the browser treats it as absolute
 *   - `/\evil.tld`        — backslash, which some browsers normalise to `/`
 *   - `home`              — relative, would resolve against the current path
 */
export function resolveNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;

  let candidate = next;

  // A link may arrive with the value encoded once (our proxy writes it with
  // searchParams.set). Decode defensively — a malformed escape is itself a
  // reason to reject.
  try {
    candidate = decodeURIComponent(next);
  } catch {
    return fallback;
  }

  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  if (candidate.startsWith("/\\")) return fallback;

  return candidate;
}
