# Form Components Reference

shadcn `radix-nova` style (see `components.json`) under `@/components/ui/`. Path alias is
`@/*` → `./src/*`.

## Import pattern

```tsx
"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { z } from "zod";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/cusotm/password-input"; // sic — dir is misspelled

import { createPostAction } from "@/server/posts";
import { CreatePostSchema } from "@/server/posts/schemas";
```

There is **no `@/components/ui/form`**. `Form`, `FormField`, `FormItem`, `FormControl`,
`FormMessage`, and `useFormField` do not exist in this repo.

## Available today

| Module | Exports |
|---|---|
| `@/components/ui/field` | `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldLegend`, `FieldSeparator`, `FieldSet`, `FieldContent`, `FieldTitle` |
| `@/components/ui/input` | `Input` |
| `@/components/ui/textarea` | `Textarea` |
| `@/components/ui/input-group` | `InputGroup`, `InputGroupAddon`, `InputGroupButton`, `InputGroupText`, `InputGroupInput`, `InputGroupTextarea` |
| `@/components/ui/button` | `Button`, `buttonVariants` |
| `@/components/ui/label` | `Label` |
| `@/components/ui/separator` | `Separator` |
| `@/components/ui/cusotm/password-input` | `PasswordInput` |

**Not installed:** `Checkbox`, `Switch`, `Select`, `RadioGroup`, `Alert`, `Card`, `Dialog`, `Sonner`.
Add before use: `pnpm dlx shadcn@latest add checkbox select`.

### `Button` variants

`variant`: `default` · `outline` · `secondary` · `ghost` · `destructive` · `link`
`size`: `default` · `xs` · `sm` (plus the rest of the stock scale)

No `primary` variant — that was another project. `default` is the primary-looking one.

---

## The field shapes

### Text / email / number

```tsx
<Field data-invalid={!!errors.title}>
  <FieldLabel htmlFor="title">Title</FieldLabel>
  <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
  <FieldDescription>Shown at the top of the post.</FieldDescription>
  <FieldError errors={[errors.title]} />
</Field>
```

For a number field, the input is `type="number"` and the **schema** does the work:

```tsx
<Input id="days" type="number" aria-invalid={!!errors.days} {...register("days")} />
// schema: days: z.coerce.number().int().min(0, "Must be at least 0")
```

`z.coerce` is required — `<input type="number">` still hands you a string.

### Textarea

```tsx
<Field data-invalid={!!errors.body}>
  <FieldLabel htmlFor="body">Body</FieldLabel>
  <Textarea id="body" rows={8} aria-invalid={!!errors.body} {...register("body")} />
  <FieldError errors={[errors.body]} />
</Field>
```

### Password

`PasswordInput` takes `React.ComponentProps<"input">` and spreads through to its inner
`InputGroupInput`, so `register()` works directly — no `Controller` needed.

```tsx
<Field data-invalid={!!errors.password}>
  <FieldLabel htmlFor="password">Password</FieldLabel>
  <PasswordInput id="password" aria-invalid={!!errors.password} {...register("password")} />
  <FieldError errors={[errors.password]} />
</Field>
```

It renders its own lock icon and show/hide toggle. Don't wrap it in another `InputGroup`.

### Input with an addon (prefix, suffix, inline button)

```tsx
<Field data-invalid={!!errors.slug}>
  <FieldLabel htmlFor="slug">Slug</FieldLabel>
  <InputGroup>
    <InputGroupAddon>
      <InputGroupText>/posts/</InputGroupText>
    </InputGroupAddon>
    <InputGroupInput id="slug" aria-invalid={!!errors.slug} {...register("slug")} />
  </InputGroup>
  <FieldError errors={[errors.slug]} />
</Field>
```

`InputGroupAddon` takes `align="inline-end"` to sit on the right.

### Checkbox / Switch (requires `shadcn add checkbox`)

Radix controls use `checked` / `onCheckedChange`, **not** a native `onChange`. A `register()` spread
does nothing here — the value never reaches form state. Use `Controller`.

```tsx
<Field orientation="horizontal" data-invalid={!!errors.published}>
  <Controller
    control={control}
    name="published"
    render={({ field }) => (
      <Checkbox
        id="published"
        checked={field.value}
        onCheckedChange={field.onChange}
        aria-invalid={!!errors.published}
      />
    )}
  />
  <FieldContent>
    <FieldLabel htmlFor="published">Publish immediately</FieldLabel>
    <FieldDescription>Otherwise it's saved as a draft.</FieldDescription>
  </FieldContent>
  <FieldError errors={[errors.published]} />
</Field>
```

`orientation="horizontal"` puts the control beside the label; `FieldContent` stacks the label and
description next to it.

### Select (requires `shadcn add select`)

```tsx
<Field data-invalid={!!errors.role}>
  <FieldLabel htmlFor="role">Role</FieldLabel>
  <Controller
    control={control}
    name="role"
    render={({ field }) => (
      <Select value={field.value} onValueChange={field.onChange}>
        <SelectTrigger id="role" aria-invalid={!!errors.role}>
          <SelectValue placeholder="Select a role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="USER">User</SelectItem>
          <SelectItem value="AUTHOR">Author</SelectItem>
          <SelectItem value="ADMIN">Admin</SelectItem>
        </SelectContent>
      </Select>
    )}
  />
  <FieldError errors={[errors.role]} />
</Field>
```

Note `aria-invalid` goes on the `SelectTrigger` — that's the focusable element.

### Grouping

```tsx
<FieldSet>
  <FieldLegend>Visibility</FieldLegend>
  <FieldGroup>
    {/* fields */}
  </FieldGroup>
</FieldSet>
```

`FieldGroup` handles vertical rhythm. Don't add `space-y-*` on top of it.

---

## Complete form template

```tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { z } from "zod";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { createPostAction } from "@/server/posts";
import { CreatePostSchema } from "@/server/posts/schemas";

type CreatePostValues = z.infer<typeof CreatePostSchema>;

export function CreatePostForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreatePostValues>({
    resolver: zodResolver(CreatePostSchema),
    defaultValues: { title: "", slug: "", body: "", published: false },
  });

  const onSubmit = (values: CreatePostValues) => {
    setStatus(null);

    startTransition(async () => {
      try {
        const res = await createPostAction(values);

        if (!res.ok) {
          // A field-specific failure belongs on the field, not in a banner.
          if (res.field) {
            setError(res.field as keyof CreatePostValues, { message: res.error });
          } else {
            setStatus({ type: "error", text: res.error });
          }
          return;
        }

        router.push(`/dashboard/posts/${res.data.id}`);
      } catch {
        // Unauthorized / Forbidden / ZodError from the wrapper.
        // The real message is redacted in production — write our own.
        setStatus({ type: "error", text: "Something went wrong. Please try again." });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
          <FieldError errors={[errors.title]} />
        </Field>

        <Field data-invalid={!!errors.slug}>
          <FieldLabel htmlFor="slug">Slug</FieldLabel>
          <Input id="slug" aria-invalid={!!errors.slug} {...register("slug")} />
          <FieldDescription>Lowercase letters, numbers and dashes.</FieldDescription>
          <FieldError errors={[errors.slug]} />
        </Field>

        <Field data-invalid={!!errors.body}>
          <FieldLabel htmlFor="body">Body</FieldLabel>
          <Textarea id="body" rows={8} aria-invalid={!!errors.body} {...register("body")} />
          <FieldError errors={[errors.body]} />
        </Field>

        {status && (
          <p
            role="status"
            className={
              status.type === "error"
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {status.text}
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          Create post
        </Button>
      </FieldGroup>
    </form>
  );
}
```

The paired schema, imported above and re-parsed inside the action:

```ts
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

One schema, two consumers. The form uses it for immediate feedback; `authAction` re-parses it as the
security boundary. See the `server-action-builder` skill for the action side.
