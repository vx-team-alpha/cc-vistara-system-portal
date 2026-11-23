# `authAction` Examples

Copy-ready shapes for the common cases. The repo has no domain actions yet — these are the
patterns to establish, not files to read.

The examples assume a shared result type. Create it once:

```typescript
// src/server/types.ts
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };
```

---

## 1. Authenticated mutation (the default shape)

Most actions look like this: a schema, an `authAction`, an RLS-bound write, a revalidate.

```typescript
// src/server/posts/schemas.ts
import { z } from "zod";

export const CreatePostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  body: z.string().min(1, "Body is required"),
  published: z.boolean().default(false),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;
```

```typescript
// src/server/posts/index.ts
"use server";

import { revalidatePath } from "next/cache";

import { authAction } from "@/server/auth-wrapper";
import type { ActionResult } from "@/server/types";

import { CreatePostSchema } from "./schemas";

export const createPostAction = authAction(
  async ({ user, supabase }, input): Promise<ActionResult<{ id: string }>> => {
    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: user.id, // RLS enforces this too — belt and braces
        title: input.title,
        slug: input.slug,
        body: input.body,
        published: input.published,
      })
      .select("id")
      .single();

    if (error) {
      // 23505 = unique_violation
      return error.code === "23505"
        ? { ok: false, error: "That slug is already taken.", field: "slug" }
        : { ok: false, error: "Could not create the post." };
    }

    revalidatePath("/dashboard/posts");
    return { ok: true, data: { id: data.id } };
  },
  { schema: CreatePostSchema },
);
```

The `error.message` from Postgres is not returned to the client verbatim — it can leak column and
constraint names. Map the codes you expect and fall back to a generic message.

---

## 2. Role-gated action

Pass `roles` and the wrapper loads `profiles`, checks the role, and throws `ForbiddenError` before
your handler runs. Inside the handler, `profile` is populated and already verified.

```typescript
// src/server/posts/index.ts
import { DeletePostSchema } from "./schemas"; // z.object({ id: z.uuid() })

export const deleteAnyPostAction = authAction(
  async ({ profile, supabase }, input): Promise<ActionResult> => {
    // profile.role is guaranteed to be "ADMIN" — the wrapper already checked
    const { error } = await supabase.from("posts").delete().eq("id", input.id);

    if (error) {
      return { ok: false, error: "Could not delete the post." };
    }

    revalidatePath("/dashboard/posts");
    return { ok: true, data: undefined };
  },
  { schema: DeletePostSchema, roles: ["ADMIN"] },
);
```

`roles` is an OR — `roles: ["AUTHOR", "ADMIN"]` admits either. For "the author of _this_ post, or
any admin", the role list can't express it; gate in RLS, or check ownership in the handler:

```typescript
export const deleteOwnPostAction = authAction(
  async ({ user, profile, supabase }, input): Promise<ActionResult> => {
    const { data: post } = await supabase
      .from("posts")
      .select("author_id")
      .eq("id", input.id)
      .single();

    if (!post) return { ok: false, error: "Post not found." };

    const isOwner = post.author_id === user.id;
    const isAdmin = profile?.role === "ADMIN";
    if (!isOwner && !isAdmin) return { ok: false, error: "Not your post." };

    await supabase.from("posts").delete().eq("id", input.id);
    revalidatePath("/dashboard/posts");
    return { ok: true, data: undefined };
  },
  { schema: DeletePostSchema, roles: ["AUTHOR", "ADMIN"] },
);
```

---

## 3. Authenticated read

Reads go through the same wrapper. RLS scopes the rows; you don't filter by user unless you want
the query to be self-documenting.

```typescript
export const listMyPostsAction = authAction(
  async ({ user, supabase }, input): Promise<ActionResult<Post[]>> => {
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, slug, published, created_at")
      .eq("author_id", user.id) // redundant with RLS, but explicit
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (error) return { ok: false, error: "Could not load posts." };
    return { ok: true, data: data as Post[] };
  },
  {
    schema: z.object({
      limit: z.number().int().max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }),
  },
);
```

Cap the page size in the schema. `limit` is attacker-controlled; without `.max(100)` someone
requests a million rows.

For data a Server Component needs at render time, prefer querying Supabase directly in the
component — a Server Action is an extra HTTP round trip you don't need on the render path.

---

## 4. Typed profile

When you need profile columns beyond `role`, parameterize the third generic. Without it, extra
columns are typed `unknown`.

```typescript
import type { Role } from "@/server/auth-wrapper";

type AuthorProfile = {
  user_id: string;
  role: Role;
  display_name: string;
};

export const publishPostAction = authAction<typeof PublishSchema, ActionResult, AuthorProfile>(
  async ({ profile, supabase }, input) => {
    // profile!.display_name is string, not unknown
    const { error } = await supabase
      .from("posts")
      .update({ published: true, published_by: profile!.display_name })
      .eq("id", input.id);

    if (error) return { ok: false, error: "Could not publish." };

    revalidatePath("/posts/[slug]", "page");
    return { ok: true, data: undefined };
  },
  { schema: PublishSchema, roles: ["AUTHOR", "ADMIN"] },
);
```

The `!` on `profile` is only sound because `roles` is present. In an action without `roles`,
`profile` is `undefined` at runtime and `profile!.x` throws.

---

## 5. Public (unauthenticated) action

`authAction` throws `UnauthorizedError` for anonymous callers by design, so a public form cannot
use it. Write a plain Server Function and validate by hand.

```typescript
// src/server/contact/index.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/server/types";

import { ContactSchema } from "./schemas";

export async function submitContactAction(raw: unknown): Promise<ActionResult> {
  const parsed = ContactSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert(parsed.data);

  if (error) return { ok: false, error: "Could not send your message." };
  return { ok: true, data: undefined };
}
```

This needs an RLS policy granting `anon` an INSERT on `contact_messages` — the anon key has no
implicit grants. Rate-limit it too: it's an unauthenticated write endpoint open to the internet.

Note `safeParse` here rather than `parse`. A public endpoint should return a validation failure,
not throw one.

---

## 6. Calling an action from a client component

```typescript
"use client";

import { useTransition } from "react";

import { createPostAction } from "@/server/posts";
import type { CreatePostInput } from "@/server/posts/schemas";

export function NewPostForm() {
  const [isPending, startTransition] = useTransition();

  const onSubmit = (values: CreatePostInput) => {
    startTransition(async () => {
      try {
        const res = await createPostAction(values);

        if (!res.ok) {
          // Expected failure — the message is safe to show
          toast.error(res.error);
          return;
        }

        toast.success("Post created");
        router.push(`/dashboard/posts/${res.data.id}`);
      } catch {
        // Thrown failure — Unauthorized / Forbidden / ZodError.
        // The real message is redacted in production; do NOT surface err.message.
        toast.error("Something went wrong. Please try again.");
      }
    });
  };
}
```

Both branches matter. `res.ok === false` is a failure you chose to model and whose message you
wrote. The `catch` is for the ones the wrapper throws, and in a production build their messages are
replaced with a generic string plus a `digest` — so print your own copy, not the error's.

Validate with the same schema client-side (`CreatePostSchema`) so the action's `parse` is a
backstop rather than the user's first feedback. See `/react-form-builder`.
