import { NextResponse, type NextRequest } from "next/server";
import { authPaths, isProtectedPath } from "@/lib/auth/config";
import { createProxyClient } from "@/lib/supabase/proxy-client";

/**
 * Session refresh + an optimistic route gate.
 *
 * In Next.js 16 this file convention is `proxy.ts`; it was called `middleware.ts`
 * before. Same feature, new name.
 *
 * This runs on every matched request for one reason: it is the only place a
 * refreshed Supabase session can be persisted. See `@/lib/supabase/server.ts`
 * for why a Server Component cannot do it.
 */
export async function proxy(request: NextRequest) {
  // Every cookie write below lands on THIS object, and it is what we return.
  const response = NextResponse.next({ request });

  const supabase = createProxyClient(request, response);

  // The load-bearing call. Reading the claims is what refreshes an expired
  // access token, and `createProxyClient`'s setAll is what persists the result.
  // Not calling it means never refreshing.
  //
  // The local CLI issues ES256 (asymmetric) JWTs, so getClaims() verifies the
  // token locally against the project's JWKS instead of round-tripping to
  // GoTrue on every navigation.
  const { data, error } = await supabase.auth.getClaims();

  const claims = error ? null : data?.claims;

  // There is deliberately NO MFA step-up gate here.
  //
  // The obvious version — `claims.aal === 'aal1' && isProtectedPath(...)` ->
  // redirect to /auth/verify — is an infinite redirect loop. A password-only
  // session is aal1 whether or not the account has a second factor, so a user
  // with no factor enrolled gets sent to /auth/verify, which redirects back
  // (nothing to verify), which is protected and still aal1, which redirects
  // again. Forever.
  //
  // The claims cannot tell "no factor enrolled" from "enrolled, not stepped up".
  // Only mfa.getAuthenticatorAssuranceLevel() can, and that is a GoTrue
  // round-trip on EVERY navigation — the cost this whole claims-based design
  // exists to avoid.
  //
  // So step-up is decided once, at sign-in: `postSignInDestination` in
  // @/server/auth checks the assurance level and routes to /auth/verify then.
  // If you later need to enforce aal2 on a specific route, do it in that route's
  // own server component (one check, one request), not here.
  if (!claims && isProtectedPath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = authPaths.signIn;
    redirectUrl.search = "";

    // `searchParams.set` percent-encodes the value. The source interpolated
    // `next` into the query string raw, which mangled any path containing a
    // space, `&`, or `#`.
    redirectUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    // A redirect is a different response object, so cookies written into
    // `response` above are not on it. Copy them across or a refresh that
    // happened on this pass is lost.
    const redirectResponse = NextResponse.redirect(redirectUrl);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  // MUST be the same object handed to `createProxyClient`. Returning a fresh
  // `NextResponse.next()` here silently drops the refreshed cookies — the single
  // most common way to break this file.
  return response;
}

export const config = {
  matcher: [
    /**
     * Everything except static assets, well-known metadata files, and the
     * healthcheck.
     *
     * The metadata/extension list below (robots.txt, sitemap.xml, manifest,
     * .well-known, and the added avif/css/map/otf/media extensions) was
     * missing before — each of those paths still ran a full `getClaims()`
     * verify with nothing to show for it, since none of them are pages a user
     * signs in to see.
     *
     * `/api` is deliberately NOT excluded: API routes need session refresh too,
     * and skipping them means a long-lived fetch client's token expires with
     * nothing to renew it. Auth itself is still enforced per-route by
     * `authRoute` from `@/server/auth-wrapper`, which returns a JSON 401 rather
     * than redirecting a fetch caller to an HTML page. `.js` is likewise NOT
     * excluded here — the app's own compiled JS lives under `_next/static`,
     * already excluded above; a plain `.js` path is either that (already
     * skipped) or a page-adjacent asset that still wants the session refresh.
     */
    "/((?!_next/static|_next/image|healthcheck|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|site\\.webmanifest|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|map|woff|woff2|ttf|otf|mp4|webm|mp3|wav)$).*)",
  ],
};
