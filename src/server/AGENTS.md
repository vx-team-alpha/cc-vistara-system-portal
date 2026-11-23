# Next.js Server Utilities (`src/server/`)

## Quick Reference

| Function     | Import                                     | Purpose                                                                |
| ------------ | ------------------------------------------ | ---------------------------------------------------------------------- |
| `authAction` | `@/server/auth-wrapper` (`auth-action.ts`) | Server Actions — Zod validation + auth + optional role check           |
| `authRoute`  | `@/server/auth-wrapper` (`auth-route.ts`)  | Route Handlers — same, plus HTTP status-code mapping for thrown errors |

Both throw typed errors (`UnauthorizedError`, `ForbiddenError`, `ProfileNotFoundError` — `errors.ts`)
rather than returning a result union. `authRoute` additionally catches them, and `ZodError`, at the
boundary and serializes to the right HTTP status — a Route Handler is a public endpoint with none
of a Server Action's built-in origin/CSRF checks, so it has to turn failures into a response itself.

## Guidelines

- Server Actions are for mutations invoked from a form, `useActionState`, or a client transition.
  Route Handlers are for anything reachable by a plain HTTP request instead — webhooks, third-party
  integrations, non-UI responses (RSS, redirects), or an endpoint a Server Action can't express.
- Authorization is primarily RLS. The `roles` option on `authAction`/`authRoute` is a fast-fail
  before the query runs, not a substitute for RLS policies on the table itself.
- Always validate with a Zod schema — treat `FormData`, JSON bodies, and query params as
  attacker-controlled.
- `"use server"` goes on the file that exports the _wrapped_ action, not inside `auth-action.ts`
  itself. The wrapper is a synchronous factory that returns an async function; Next requires every
  export of a `"use server"` file to itself be async, so marking the wrapper module would break the
  build.
- Call `revalidatePath` after a Server Action mutation. Route Handlers get no automatic re-render —
  the caller re-fetches.

## Skills

For detailed implementation patterns:

- `/server-action-builder` — Server Action workflow with `authAction`

## Server Action pattern

```typescript
"use server";

import { authAction } from "@/server/auth-wrapper";

import { CreateBlogSchema } from "./schemas";

export const createBlogAction = authAction(
  async ({ user, supabase }, input) => {
    // implementation
    return { success: true };
  },
  {
    schema: CreateBlogSchema,
  },
);
```

## Route Handler pattern

```typescript
// app/api/posts/route.ts
import { NextResponse } from "next/server";

import { authRoute } from "@/server/auth-wrapper";

import { CreatePostSchema } from "./schemas";

export const POST = authRoute(
  async ({ user, supabase }, input) => {
    const { data, error } = await supabase
      .from("posts")
      .insert({ ...input, user_id: user.id })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  },
  { schema: CreatePostSchema, roles: ["AUTHOR", "ADMIN"] },
);
```

`schema` is optional on `authRoute` (a `GET` with no input doesn't need one). When present, it's
parsed against `searchParams` for `GET`/`HEAD` and the JSON body otherwise.

## Revalidation

- Use `revalidatePath` after mutations
- Never use `router.refresh()` or `router.push()` after Server Actions
