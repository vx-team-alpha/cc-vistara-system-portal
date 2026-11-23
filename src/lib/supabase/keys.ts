import { z } from "zod";

/**
 * Env validation for the Supabase clients.
 *
 * These parse at module load and throw. That is deliberate: the alternative —
 * `process.env.NEXT_PUBLIC_SUPABASE_URL!` — turns a missing key into `undefined`
 * at runtime, and a Supabase client built on `undefined` does not fail loudly,
 * it degrades to an unauthenticated client whose every RLS-guarded query comes
 * back as an empty set. That reads as "no data" rather than "misconfigured", so
 * fail at boot instead.
 */

const publicKeysSchema = z.object({
  url: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  anonKey: z.string().min(1, "Supabase anon/publishable key is required"),
});

const secretKeySchema = z.string().min(1, "Supabase secret/service-role key is required");

let cachedClientKeys: ReturnType<typeof publicKeysSchema.parse> | undefined;

/**
 * Safe to call from the browser: both values are `NEXT_PUBLIC_*`, so Next inlines
 * them at build time.
 *
 * Reads the new `*_PUBLISHABLE_KEY` name first and falls back to the legacy
 * `*_ANON_KEY`. Supabase renamed these (`sb_publishable_…` supersedes the old
 * anon JWT); accepting both means this works before and after a project rotates.
 *
 * Memoized at module scope rather than parsed fresh on every call — this is
 * called on every `createClient()`, which is itself called multiple times per
 * request (every action, every page), so a naive re-parse re-validates the same
 * two env values dozens of times over the life of the process for no reason.
 * `process.env` does not change at runtime, so caching the parsed result is
 * safe. Stays lazy (parsed on first call, not at import time) so importing this
 * module never throws before the env is actually needed.
 */
export function getSupabaseClientKeys() {
  return (cachedClientKeys ??= publicKeysSchema.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }));
}

/**
 * Server-only. This key bypasses RLS, so it must never reach a bundle — it is
 * kept out of `getSupabaseClientKeys` so that a browser import cannot pull it in
 * transitively, and it is read lazily rather than at module scope so that
 * importing this file from a client component does not throw.
 */
export function getSupabaseSecretKey() {
  return secretKeySchema.parse(
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
