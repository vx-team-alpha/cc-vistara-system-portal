import type { ZodType } from "zod";

import { resolveAuthContext } from "./context";
import type { AuthActionHandler, AuthActionOptions } from "./types";

/**
 * Wraps a Server Action with input validation, authentication, and account
 * loading.
 *
 * Not itself a Server Function — `authAction()` returns one, which the caller
 * exports from a `"use server"` file. (Every export of a `"use server"` module
 * must be an async function; this is a synchronous factory, so marking this file
 * would break the build.)
 *
 * Order of operations:
 *   1. `schema.parse(rawInput)` — throws ZodError on invalid input.
 *   2. `supabase.auth.getClaims()` — throws UnauthorizedError if there is no user.
 *   3. Load the caller's account — throws AccountNotFoundError if missing.
 *   4. Call the handler and return its result verbatim.
 *
 * There is no authorization step: every row in the schema belongs to exactly one
 * user, so "may I touch this?" is answered by RLS rather than by the wrapper.
 */
export function authAction<TSchema extends ZodType, TResult>(
  handler: AuthActionHandler<TSchema, TResult>,
  options: AuthActionOptions<TSchema>,
) {
  return async (rawInput: unknown): Promise<TResult> => {
    const input = options.schema.parse(rawInput);
    const ctx = await resolveAuthContext();

    return handler(ctx, input);
  };
}
