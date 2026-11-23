import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { z, ZodType } from "zod";

import type { JWTUserData } from "@/lib/auth/jwt-user";
import type { Database, Tables } from "@/types/supabase";

/** Cookie-bound, anon-key client. Every query it makes is subject to RLS. */
export type TypedSupabaseClient = SupabaseClient<Database>;

export type { JWTUserData };

export type Account = Tables<"accounts">;

export type AuthContext = {
  user: JWTUserData;
  /** The caller's account. 1:1 with `user`, so it is always loaded. */
  account: Account;
  supabase: TypedSupabaseClient;
};

export type RouteParams = Record<string, string | string[] | undefined>;

export type AuthRouteContext = AuthContext & {
  request: NextRequest;
  params: RouteParams;
};

/**
 * There is no role model in this app: `accounts` is the only table and every
 * row belongs to exactly one user, so authorization is entirely "is this your
 * row?" — which RLS answers on its own. These wrappers therefore authenticate
 * and load the account; they never authorize beyond that.
 */
export type AuthActionOptions<TSchema extends ZodType> = {
  schema: TSchema;
};

export type AuthRouteOptions<TSchema extends ZodType | undefined> = {
  schema?: TSchema;
};

export type AuthActionHandler<TSchema extends ZodType, TResult> = (
  ctx: AuthContext,
  input: z.infer<TSchema>,
) => Promise<TResult>;

export type AuthRouteHandler<TSchema extends ZodType | undefined> = (
  ctx: AuthRouteContext,
  input: TSchema extends ZodType ? z.infer<TSchema> : undefined,
) => Promise<Response>;
