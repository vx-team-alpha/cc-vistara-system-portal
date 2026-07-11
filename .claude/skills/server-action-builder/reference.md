# `authAction` Reference

Everything importable from `@/server/auth-wrapper`, plus the recipes that surround it.

## Public API

```typescript
import {
  authAction,
  authRoute,
  resolveAuthContext,
  AccountNotFoundError,
  AuthActionError,
  ForbiddenError,
  UnauthorizedError,
} from "@/server/auth-wrapper";

import type {
  Account,
  AuthActionHandler,
  AuthActionOptions,
  AuthContext,
  AuthRouteContext,
  AuthRouteHandler,
  AuthRouteOptions,
  JWTUserData,
  RouteParams,
  TypedSupabaseClient,
} from "@/server/auth-wrapper";
```

There is no `Role`, `ProfileWithRole`, or `ProfileNotFoundError` — this schema has no role model.

## `authAction(handler, options)`

```typescript
function authAction<TSchema extends ZodType, TResult>(
  handler: AuthActionHandler<TSchema, TResult>,
  options: AuthActionOptions<TSchema>,
): (rawInput: unknown) => Promise<TResult>;
```

Returns an action taking a single `unknown` argument. `TResult` is inferred from the handler's
return type — whatever you return is what the caller receives.

The returned function is the Server Function. `authAction` itself is not; it must not live in a
`"use server"` module.

### `options`

| Key | Type | Required | Behavior |
|---|---|---|---|
| `schema` | `ZodType` | yes | `schema.parse(rawInput)` runs first. Throws `ZodError` on failure |

That is the entire option surface. Authorization is RLS.

### The context object

```typescript
type AuthContext = {
  user: JWTUserData;              // from verified JWT claims — never null inside a handler
  account: Account;               // the caller's accounts row — never null inside a handler
  supabase: TypedSupabaseClient;  // anon key + cookies → RLS enforced, Database-typed
};
```

The handler receives `(ctx, input)`. `input` is **not** on `ctx` — it is the second argument, and
it is typed `z.infer<TSchema>`.

```typescript
type AuthActionHandler<TSchema, TResult> = (
  ctx: AuthContext,
  input: z.infer<TSchema>,
) => Promise<TResult>;
```

### `JWTUserData`

Deliberately **not** supabase-js's `User`. Those fields come free out of the JWT that
`getClaims()` already verified locally against the JWKS; a `User` would cost a GoTrue round-trip
on every action.

```typescript
type JWTUserData = {
  id: string;                            // the `sub` claim = auth.users.id
  email?: string;                        // absent for phone-only / anonymous
  phone?: string;
  is_anonymous: boolean;
  aal: AuthenticatorAssuranceLevels;     // "aal2" = second factor verified
  amr: AMREntry[] | string[];
  app_metadata: UserAppMetadata;
  user_metadata: UserMetadata;
};
```

Only `id` and `aal` are guaranteed by Supabase; everything else is optional in the token and typed
accordingly. It lives in `@/lib/auth/jwt-user` rather than the wrapper because the client-side
`use-user` hook maps the same claims — one mapper means the two cannot disagree.

### `Account`

```typescript
type Account = Tables<"accounts">;
// { id, name, email, picture_url, created_at, updated_at }
```

`account.id === user.id`. The `accounts` PK **is** the `auth.users` id, so there is never a
translation step between them.

## Errors

All extend `AuthActionError`, which carries a stable `code` alongside `message`:

```typescript
class AuthActionError extends Error {
  readonly code: string;
}
```

| Class | `code` | Default message | Thrown when |
|---|---|---|---|
| `UnauthorizedError` | `UNAUTHORIZED` | `Unauthorized` | `getClaims()` errored or returned no claims |
| `AccountNotFoundError` | `ACCOUNT_NOT_FOUND` | `Account not found` | Authenticated, but `current_account()` returned no row |
| `ForbiddenError` | `FORBIDDEN` | `Forbidden` | Never thrown by the wrapper — available for handlers |

Plus `ZodError` from `schema.parse()`, which is not an `AuthActionError`.

`AccountNotFoundError` is a **broken invariant**: `on_auth_user_created` creates the row inside
GoTrue's signup transaction, so it should be unreachable. `authRoute` maps it to **500**, not 404,
so it surfaces in error tracking instead of being swallowed as an expected miss.

### The production redaction problem

Next.js **strips error messages thrown inside Server Actions in production builds**, replacing them
with a generic message and a `digest`. The `code` property doesn't survive either — it belongs to a
class instance that never crosses the wire intact.

Consequences:

- `catch (e) { toast.error(e.message) }` on the client shows the real message in dev and
  `"An error occurred in the Server Components render"` in prod. Do not build UX on it.
- To distinguish failures on the client, **return** them instead of throwing (below).
- To debug them on the server, read the `digest` off the error and grep your server logs — Next.js
  logs the real error server-side against the same digest.

### Returning failures instead of throwing

The wrapper returns `TResult` verbatim, so encode expected failures in it:

```typescript
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };
```

```typescript
export const updateAccountAction = authAction(
  async ({ user, supabase }, input): Promise<ActionResult<null>> => {
    const { error } = await supabase
      .from("accounts")
      .update({ name: input.name })
      .eq("id", user.id);

    if (error) {
      return error.code === "42501"
        ? { ok: false, error: "You cannot change that field.", field: "name" }
        : { ok: false, error: "Could not save your changes." };
    }

    return { ok: true, data: null };
  },
  { schema: UpdateAccountSchema },
);
```

Postgres error codes worth branching on: `23505` unique violation, `23503` FK violation, `23514`
check violation, `42501` insufficient privilege (usually a column-grant rejection — see below).

Reserve throwing for states a correct UI never produces: not logged in, no account row, malformed
input. Those are bugs or attacks, and a generic error boundary is the right response to both.

## Column grants surface as runtime errors

`accounts` grants `update (name, picture_url)` only. Including any other column in an `.update()`
fails with Postgres `42501`, **not** a TypeScript error — the generated types describe the table,
not the grant.

```typescript
// compiles, fails at runtime with 42501:
await supabase.from("accounts").update({ email: "new@example.com" }).eq("id", user.id);
```

Email changes go through `supabase.auth.updateUser({ email })`, which verifies ownership and then
lets the `on_auth_user_email_updated` trigger sync `accounts.email`. Treat the column as read-only
from application code.

## Zod recipes (v4)

`zod@^4` is the installed major. Import from `"zod"`.

```typescript
import { z } from "zod";

export const UpdateAccountSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.email(),                       // v4: top-level, not z.string().email()
  pictureUrl: z.url().optional(),         // v4: top-level, not z.string().url()
  accountId: z.uuid(),                    // v4: top-level, not z.string().uuid()
  age: z.coerce.number().int().min(13),   // coerce: form values arrive as strings
  tags: z.array(z.string()).max(5).default([]),
});
```

In v4 the string-format validators (`z.email()`, `z.url()`, `z.uuid()`, `z.iso.datetime()`) are
top-level functions. The v3 method forms (`z.string().email()`) are deprecated.

Share the schema between the form and the action — import the same object in both. The action's
`parse` is then a backstop against direct HTTP calls, not the primary validation UX.

### Reading a `ZodError` server-side

```typescript
import { ZodError } from "zod";

try {
  await updateAccountAction(input);
} catch (err) {
  if (err instanceof ZodError) {
    console.error(err.issues); // [{ path, message, code }]
  }
}
```

`err.issues` is the v4 name; `err.errors` was v3.

## Cache revalidation

Next.js 16. The wrapper does none of this for you.

```typescript
import { revalidatePath, revalidateTag } from "next/cache";

revalidatePath("/home");                   // one route
revalidatePath("/posts/[slug]", "page");   // a dynamic route's pages
revalidateTag("posts");                    // everything tagged "posts"
```

Call these **after** the mutation succeeds and **before** you return. Revalidating on a failed
write throws away a good cache for nothing.

`redirect()` from `next/navigation` works by throwing a control-flow signal — call it after the
mutation and outside any broadly-catching `try`, or the catch will swallow the redirect.

## The Supabase client

`createClient()` from `@/lib/supabase/server` builds a `@supabase/ssr` server client bound to the
request's cookies with the **anon** key. Every query it makes runs as the calling user, with RLS
enforced. It is `async` (it awaits `cookies()`), so the wrapper awaits it once per invocation.
Don't build a second one inside your handler — use the injected `supabase`.

The **service-role** client is `@/lib/supabase/admin`. It bypasses RLS entirely, so every policy is
inert for queries made through it and scoping by `account_id` becomes your job. Never construct it
inside an `authAction` handler under the name `supabase` — that silently discards the caller's
identity. Name it `supabaseAdmin` so the bypass is legible at the call site.

## Typed queries

`ctx.supabase` is `SupabaseClient<Database>` — already generic over the generated types, so
`.from("accounts")` is fully checked. After any schema change:

```bash
pnpm supabase:typegen   # regenerates src/types/supabase.ts
```

Never hand-edit that file. The `Database` type also drives `Tables<"accounts">`, which is what
`Account` is defined from — so a schema change propagates to the wrapper's types automatically.

## `authRoute(handler, options)`

Same guarantees, for plain HTTP endpoints:

```typescript
function authRoute<TSchema extends ZodType | undefined = undefined>(
  handler: AuthRouteHandler<TSchema>,
  options?: AuthRouteOptions<TSchema>,     // { schema? }
): (request: NextRequest, context?: { params?: Promise<RouteParams> }) => Promise<Response>;
```

The handler's ctx adds `request` and `params` to the `AuthContext` fields. `schema` is optional —
when present it parses `searchParams` for `GET`/`HEAD` and the JSON body otherwise.

Unlike a Server Action, a Route Handler has none of Next's built-in origin/CSRF checks, so it maps
thrown errors to status codes itself: `ZodError` → 400, `UnauthorizedError` → 401,
`ForbiddenError` → 403, `AccountNotFoundError` → 500, `AuthActionError` → 400, unknown → 500.
