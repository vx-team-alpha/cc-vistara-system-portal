---
name: server-action-builder
description: Create Next.js Server Actions in this app using the authAction wrapper from @/server/auth-wrapper — Zod-validated input, an authenticated Supabase client, and the caller's account row. Use when implementing mutations, form submissions, or authenticated data reads under src/server/. Invoke with /server-action-builder.
---

# Server Action Builder

Server Actions live in `src/server/<domain>/`, are exported from a file marked `"use server"`, and
are built with `authAction` from `@/server/auth-wrapper`.

`authAction` is a **factory**, not a Server Function. It returns the action; the caller exports
that return value from a `"use server"` file. Do not put `"use server"` in
`src/server/auth-wrapper/auth-action.ts` — a `"use server"` module may only export async
functions, and that file exports a synchronous generic factory.

## The contract

```typescript
// src/server/auth-wrapper/auth-action.ts
export function authAction<TSchema extends ZodType, TResult>(
  handler: AuthActionHandler<TSchema, TResult>,
  options: AuthActionOptions<TSchema>,      // { schema }
): (rawInput: unknown) => Promise<TResult>
```

It does three things, in order:

1. **Validates** `rawInput` with `options.schema.parse()`. Invalid → throws `ZodError`.
2. **Authenticates + loads the account** via `resolveAuthContext()`. This calls
   `supabase.auth.getClaims()` (local JWKS verification, **not** a GoTrue round-trip) and then the
   `current_account()` RPC. No valid token → `UnauthorizedError`. No account row →
   `AccountNotFoundError`.
3. **Invokes your handler** with `({ user, account, supabase }, input)` and returns its result
   verbatim.

There is **no authorization step**. This is a single-tenant schema: every row belongs to exactly
one user, so "may I touch this?" is answered entirely by RLS. `resolveAuthContext()` takes no
arguments — there is no scope to declare.

### What it hands you

| Field | Type | Notes |
|---|---|---|
| `user` | `JWTUserData` | **Guaranteed non-null.** Read from verified JWT claims. `user.id` and `user.aal` are always present; `user.email` is `string \| undefined` (absent for phone-only/anonymous users) |
| `account` | `Account` | **Guaranteed non-null.** The caller's `accounts` row. `account.id === user.id` — the PK *is* the auth user id |
| `supabase` | `SupabaseClient<Database>` | Anon key, cookie-bound, **fully typed**. RLS applies to every query |
| `input` | `z.infer<TSchema>` | Already parsed and typed. Second positional arg, not part of ctx |

`account.id === user.id` is worth internalizing: you never need to look up an account id from a
user id, and a foreign key to `public.accounts(id)` can be satisfied with `user.id` directly.

### What it does NOT do

- **No role or entitlement check.** There is no role model in this schema. If you need one, it is a
  schema change first (`/supabase-db-changes`), not a wrapper option.
- **No revalidation.** Call `revalidatePath` / `revalidateTag` yourself after a mutation.
- **No error shaping.** It throws. See below — this is the sharpest edge in the design.

## Error handling — read this before you design a caller

`authAction` signals failure by **throwing**. That is fine on the server, but Next.js **redacts
errors thrown inside a Server Action in production**: the client receives a generic message plus a
`digest` hash, not your `"Forbidden"` string. So a client that does
`catch (e) { toast.error(e.message) }` shows the right message in dev and a useless one in prod.

Pick one of these, deliberately:

**A — Expected failures are return values (recommended for anything a form renders).**
Let the wrapper throw only for genuinely exceptional cases (not logged in, missing account row — a
correctly-built UI never triggers these). For failures the user can act on — duplicate name, row
not found, quota reached — `return` a result object from the handler:

```typescript
type Result<T> = { ok: true; data: T } | { ok: false; error: string };
```

The `TResult` generic already allows this; the wrapper returns whatever you give it.

**B — Throw everything, and translate at the boundary.** Only viable if the client never needs to
distinguish failures — e.g. an error boundary that says "Something went wrong" and offers a retry.

Either way, `ZodError` from step 1 propagates the same way. Validate on the client too (the form
schema and the action schema should be the same Zod object) so the action's `parse` is a
backstop, not the primary UX.

`AccountNotFoundError` is a **broken invariant**, not a user-facing state: the
`on_auth_user_created` trigger creates the row inside GoTrue's signup transaction, so it should be
impossible. `authRoute` maps it to a 500 (not a 404) for exactly that reason. Don't write UI that
handles it gracefully; let it surface as an error.

## Workflow

### Step 1: Define the schema

Co-locate `schemas.ts` beside the action. Export the inferred type — the form will import it.

```typescript
// src/server/account/schemas.ts
import { z } from "zod";

export const UpdateAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  picture_url: z.url("Must be a valid URL").nullable(),
});

export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;
```

Zod is **v4** (`zod@^4`). Import from `"zod"`, not `"zod/v4"`.

### Step 2: Write the action

```typescript
// src/server/account/index.ts
"use server";

import { revalidatePath } from "next/cache";
import { authAction } from "@/server/auth-wrapper";
import { UpdateAccountSchema } from "./schemas";

export const updateAccountAction = authAction(
  async ({ user, supabase }, input) => {
    const { error } = await supabase
      .from("accounts")
      .update({ name: input.name, picture_url: input.picture_url })
      .eq("id", user.id);

    if (error) {
      return { ok: false as const, error: error.message };
    }

    revalidatePath("/home");
    return { ok: true as const };
  },
  { schema: UpdateAccountSchema },
);
```

Only `name` and `picture_url` are in the column-level UPDATE grant. Including any other column in
that `.update({...})` — `email`, `id`, `created_at` — fails with "permission denied for column",
by design. Email changes go through `supabase.auth.updateUser()`, which verifies ownership and
then feeds the sync trigger.

## Key patterns

1. **Trust `user` and `account`. Don't re-check them.** The wrapper already threw if either was
   missing. An `if (!user) return ...` guard inside a handler is dead code.

2. **`account.id === user.id`.** Use either; don't query `accounts` to translate between them. For
   a new owned table, `account_id: user.id` is correct.

3. **Let RLS do the row filtering.** The client is anon-key + cookie-bound, so RLS applies to every
   query. Writing `.eq("id", user.id)` on top of a self-scoped policy is redundant but harmless and
   self-documenting. What RLS cannot do is validate your *input* — that's Zod's job, and it's why
   every action takes a schema.

4. **Never construct an admin client inside a handler and shadow `supabase`.** That silently
   discards the caller's identity and every RLS policy. The service-role client lives at
   `@/lib/supabase/admin`; if you need it, name it `supabaseAdmin` so the bypass is visible in
   review.

5. **Public actions skip `authAction` entirely.** A contact form that anonymous visitors submit
   can't use it — the wrapper throws `UnauthorizedError` for anonymous callers by design. Write a
   plain `"use server"` async function and validate with the schema yourself.

6. **`await` your side effects.** Serverless teardown kills in-flight promises. Await your email
   sends and webhook posts; don't fire-and-forget.

7. **Revalidate after mutations.** `revalidatePath("/home")` or `revalidateTag(...)`. The wrapper
   won't do it for you. Never use `router.refresh()` or `router.push()` for this.

8. **A Server Action is a public HTTP endpoint.** Its arguments are attacker-controlled and its
   presence in a `"use server"` file makes it callable by anyone who can reach your app, whether or
   not any UI links to it. The schema and RLS are the entire defense.

## Adding a new owned table

`authAction` needs no changes to support one — the pattern is entirely in the schema:

1. Create the table with `account_id uuid not null references public.accounts (id) on delete cascade`.
2. Add the four self-scoped policies and the column grants (`/postgres-expert` has the template).
3. `pnpm supabase:diff` + `pnpm supabase:typegen` (`/supabase-db-changes`).
4. Write the action; `supabase.from("<table>")` is typed automatically.

## File structure

```
src/server/
├── auth-wrapper/
│   ├── auth-action.ts     # authAction factory — no "use server" here
│   ├── auth-route.ts      # authRoute — same, plus HTTP status mapping
│   ├── context.ts         # resolveAuthContext() — auth + account load
│   ├── errors.ts          # AuthActionError + Unauthorized/Forbidden/AccountNotFound
│   ├── types.ts           # Account, AuthContext, AuthActionOptions, AuthActionHandler
│   └── index.ts           # public entry point
└── <domain>/
    ├── index.ts           # "use server" — the exported actions
    └── schemas.ts         # Zod schemas + inferred input types
```

Always import from `@/server/auth-wrapper`, not from the individual files.

## Route Handlers

`authRoute` is the same wrapper for plain HTTP endpoints (webhooks, non-UI responses). It adds
status-code mapping: `ZodError` → 400, `UnauthorizedError` → 401, `ForbiddenError` → 403,
`AccountNotFoundError` → 500, `AuthActionError` → 400, anything else → 500.

`schema` is optional there (a `GET` with no input doesn't need one). When present it's parsed
against `searchParams` for `GET`/`HEAD`, and the JSON body otherwise.

`ForbiddenError` is no longer raised by the wrapper itself — nothing in it authorizes — but the
class and its 403 mapping remain for handlers that need to reject a request without hand-rolling a
response.

## Reference files

- `[Examples](examples.md)` — complete actions: update, list, public, form-wired
- `[Reference](reference.md)` — full API surface, types, error classes, Zod and revalidation recipes
