import type {
  AMREntry,
  AuthenticatorAssuranceLevels,
  JwtPayload,
  UserAppMetadata,
  UserMetadata,
} from "@supabase/supabase-js";

/**
 * The caller, as read from the verified access-token claims.
 *
 * This is deliberately NOT supabase-js's `User`. Getting a `User` costs a
 * network round-trip to GoTrue (`auth.getUser()`); these fields come free out of
 * the JWT that `auth.getClaims()` already verified locally against the JWKS.
 *
 * Only `id` and `aal` are guaranteed by Supabase. Everything else is optional in
 * the token — `email` is absent for a phone-only or anonymous user — so it is
 * typed optional here rather than lied about as `string`.
 *
 * Lives in `lib/` rather than `server/auth-wrapper/` because both sides need it:
 * the server maps claims here, and `use-user` maps the same claims on the client.
 * One mapper means the two cannot disagree about what a user is.
 */
export type JWTUserData = {
  /** The `sub` claim — the `auth.users.id` this token was issued for. */
  id: string;
  email?: string;
  phone?: string;
  is_anonymous: boolean;
  /** Assurance level. `aal2` means a second factor has been verified. */
  aal: AuthenticatorAssuranceLevels;
  amr: AMREntry[] | string[];
  app_metadata: UserAppMetadata;
  user_metadata: UserMetadata;
};

export function toJWTUserData(claims: JwtPayload): JWTUserData {
  return {
    id: claims.sub,
    email: claims.email,
    phone: claims.phone,
    is_anonymous: claims.is_anonymous ?? false,
    aal: claims.aal,
    amr: claims.amr ?? [],
    app_metadata: claims.app_metadata ?? {},
    user_metadata: claims.user_metadata ?? {},
  };
}
