---
name: react-form-builder
description: Create or modify client-side forms in this app using react-hook-form, Zod v4, the shadcn Field component family from @/components/ui/field, and server actions built with authAction. Use when building forms with validation, error handling, loading states, and TypeScript typing. Invoke with /react-form-builder or when the user mentions creating forms, form validation, or react-hook-form.
---

# React Form Builder

Forms are client components using `react-hook-form` + `zodResolver`, composed from the shadcn
**Field** primitives in `@/components/ui/field`, submitting to server actions built with
`authAction` from `@/server/auth-wrapper`.

There is no reference form in the repo yet — this skill defines the pattern. The full template is
in `[Components](components.md)`.

## Read this first: Field is not FormField

If you know shadcn's older `form.tsx` (`<Form>`, `<FormField>`, `<FormItem>`, `<FormControl>`,
`<FormMessage>`, `useFormField`), **none of it exists here and none of it will compile.** This repo
uses the newer Field family, and the difference is not cosmetic:

| Old `form.tsx` | This repo's `field.tsx` |
|---|---|
| `<Form {...form}>` provider wrapping `<form>` | **No provider.** Use the native `<form>` directly |
| `<FormField control={} name={} render={} />` | **Doesn't exist.** Use `register()` or RHF's `<Controller>` |
| `<FormMessage />` reads errors from context | `<FieldError errors={[errors.title]} />` — **you pass errors in explicitly** |
| `<FormLabel>` auto-wires `htmlFor`/`id` | `<FieldLabel htmlFor="title">` — **you wire it yourself** |
| `<FormControl>` injects a11y props | **Doesn't exist.** Set `aria-invalid` on the input yourself |

`Field` components are presentational. They carry no react-hook-form context. Every wire between
RHF state and the markup is one you write.

Exports from `@/components/ui/field`: `Field`, `FieldLabel`, `FieldDescription`, `FieldError`,
`FieldGroup`, `FieldLegend`, `FieldSeparator`, `FieldSet`, `FieldContent`, `FieldTitle`.

## What exists in `@/components/ui/`

```
button.tsx        Button, buttonVariants
field.tsx         the Field family (above)
input.tsx         Input
input-group.tsx   InputGroup, InputGroupAddon, InputGroupButton, InputGroupText,
                  InputGroupInput, InputGroupTextarea
label.tsx         Label
separator.tsx     Separator
textarea.tsx      Textarea
cusotm/           ← note the typo, it's the real directory name
  password-input.tsx   PasswordInput
```

**That is the entire inventory.** There is no `Checkbox`, `Switch`, `Select`, `RadioGroup`,
`Alert`, `Card`, `Dialog`, or `Sonner`/`Toaster`. If a form needs one, add it first:

```bash
pnpm dlx shadcn@latest add checkbox select
```

Do not hand-roll a shadcn component that the registry can generate — the generated one will match
the `radix-nova` style configured in `components.json`.

**There is no toast library installed.** `sonner` is not a dependency, so `import { toast } from
"sonner"` will not resolve. Either add it (`pnpm dlx shadcn@latest add sonner`, then mount
`<Toaster />` in the root layout) or report submit results inline — see "Reporting the result"
below. Inline is what compiles today.

## Core requirements

### 1. Typed `useForm` with `zodResolver`

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreatePostSchema } from "@/server/posts/schemas";

type CreatePostValues = z.infer<typeof CreatePostSchema>;

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<CreatePostValues>({
  resolver: zodResolver(CreatePostSchema),
  defaultValues: { title: "", body: "", published: false },
});
```

Import the schema **from the server action's `schemas.ts`**, don't redeclare it. One schema, two
consumers: the form validates with it for UX, the action re-parses with it as a security boundary.

Always supply `defaultValues` for every field. A field starting as `undefined` flips from
uncontrolled to controlled on first keystroke and React warns.

Zod is **v4** and `@hookform/resolvers` is **v5** — `zodResolver` from `@hookform/resolvers/zod`
handles v4 schemas. In v4 the string formats are top-level: `z.email()`, `z.url()`, `z.uuid()`, not
`z.string().email()`.

### 2. Wire each field by hand

The Field components don't do this for you. Every text field is the same four-part shape: label,
input, optional description, error.

```tsx
<Field data-invalid={!!errors.title}>
  <FieldLabel htmlFor="title">Title</FieldLabel>
  <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
  <FieldDescription>Shown at the top of the post.</FieldDescription>
  <FieldError errors={[errors.title]} />
</Field>
```

Four things must line up, and nothing checks them for you:

- `htmlFor` on the label matches `id` on the input.
- `aria-invalid` on the input drives its red styling (the Input's classes key off it).
- `data-invalid` on the `Field` drives the label's destructive colour.
- `FieldError` receives the error in an **array**: `errors={[errors.title]}`. It renders one message
  plainly, several as a bulleted list, and `null` when the array is empty — so it is safe to leave
  in place unconditionally.

Wrap the fields in a `FieldGroup` for consistent spacing rather than reaching for `space-y-4`.

### 3. Coerce numbers and dates

An `<input type="number">` or `type="date"` produces a **string**. Coerce in the schema:

```ts
extraTrialDays: z.coerce.number().int().min(0, "Must be at least 0"),
maxRedemptions: z.coerce.number().int().positive().optional(),
```

Without `z.coerce`, a numeric field fails validation with "expected number, received string" and the
message is confusing.

### 4. `register()` for native inputs, `Controller` for everything else

`register()` returns `{ name, onChange, onBlur, ref }` and works by spreading onto anything that
behaves like a native input — `Input`, `Textarea`, `InputGroupInput`, and `PasswordInput` (it takes
`React.ComponentProps<"input">` and spreads through).

Components with a non-native value API — a shadcn `Checkbox` or `Switch` (`checked` /
`onCheckedChange`), a `Select` (`value` / `onValueChange`) — **cannot** take a `{...register()}`
spread. Use RHF's `Controller`:

```tsx
<Controller
  control={control}
  name="published"
  render={({ field }) => (
    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
  )}
/>
```

Spreading `register()` onto a Radix-based control silently does nothing — the value never reaches
the form state, and the field submits as its default forever. It's a quiet bug; reach for
`Controller` whenever the component isn't a real `<input>`.

### 5. Submit inside `useTransition`

```tsx
const [isPending, startTransition] = useTransition();

const onSubmit = (values: CreatePostValues) => {
  startTransition(async () => {
    // call the action
  });
};

<form onSubmit={handleSubmit(onSubmit)}>
```

Use `isPending` to disable the submit button. Do not add a parallel `useState` for loading — RHF's
`formState.isSubmitting` also exists, but it does not cover the server action's round trip when the
call is wrapped in a transition. Pick `isPending` and stay consistent.

### 6. Handle both failure channels from the action

Actions built with `authAction` fail in **two different ways**, and a form that handles only one is
broken:

- **Returned failures** — whatever your handler returns for expected problems (duplicate slug, row
  not found). These carry a message you wrote and it is safe to display.
- **Thrown failures** — `UnauthorizedError`, `ForbiddenError`, `ProfileNotFoundError`, `ZodError`.
  These come out of the wrapper itself.

```tsx
startTransition(async () => {
  try {
    const res = await createPostAction(values);

    if (!res.ok) {
      setStatus({ type: "error", text: res.error });   // your message
      return;
    }

    router.push(`/dashboard/posts/${res.data.id}`);
  } catch {
    // Redacted in production — do NOT surface err.message
    setStatus({ type: "error", text: "Something went wrong. Please try again." });
  }
});
```

**Never render `err.message` from the `catch`.** Next.js strips error messages thrown inside Server
Actions in production builds and replaces them with a generic string plus a `digest`. The message
looks right in dev and is useless in prod. Write your own copy in the catch. See the
`server-action-builder` skill.

If the action returns a field-specific error, route it back into RHF instead of a banner:

```tsx
if (!res.ok) {
  if (res.field) {
    setError(res.field as keyof CreatePostValues, { message: res.error });
  } else {
    setStatus({ type: "error", text: res.error });
  }
  return;
}
```

### 7. Reporting the result

With no toast library installed, keep a small status object in state and render it above the submit
button:

```tsx
const [status, setStatus] = useState<{ type: "error" | "success"; text: string } | null>(null);

{status && (
  <p
    role="status"
    className={status.type === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
  >
    {status.text}
  </p>
)}
```

`role="status"` announces it to screen readers. Clear it at the top of `onSubmit` so a stale error
doesn't linger through the next attempt.

If the project adds `sonner`, swap this for `toast.error(...)` / `toast.success(...)` — but keep
persistent errors (destructive confirmations, password reset failures) inline, where they can't be
missed.

### 8. Redirect from the form, not the action

Calling `redirect()` inside an `authAction` handler works by throwing a control-flow signal, and any
`try`/`catch` in the handler will swallow it. Have the action return the destination and navigate
from the client with `router.push(...)`.

### 9. Validate on the server too

Client-side Zod is a UX affordance, not a security boundary. A server action compiles to a public
POST endpoint whose arguments are attacker-controlled, callable whether or not any UI links to it.
The same schema must be the action's `schema` option. See `server-action-builder`.

## Accessibility

- Every field gets a `FieldLabel` with `htmlFor` matching the input's `id`. Nothing wires this
  automatically.
- Set `aria-invalid={!!errors.x}` on the input and `data-invalid={!!errors.x}` on the `Field`.
- `FieldError` renders `role="alert"` itself — leave it mounted; it returns `null` when there's no
  error.
- Use `FieldDescription` for guidance text, and point the input at it with
  `aria-describedby="title-description"` when the guidance matters for completing the field.
- Disable the submit button while `isPending` and show a `<Loader2 className="animate-spin" />`
  (from `lucide-react`, which is installed).
- Group related fields in a `FieldSet` with a `FieldLegend`.

## Anti-patterns

- Importing anything from `@/components/ui/form` — **the file does not exist.**
- `<FormField>`, `<FormControl>`, `<FormMessage>`, `useFormField` — none exist. See the table above.
- `import { toast } from "sonner"` — not installed. Add it or report inline.
- Spreading `{...register(...)}` onto a Radix control (`Checkbox`, `Switch`, `Select`). Use
  `Controller`.
- `<FieldError>` without the `errors` prop — it reads nothing from context and will render nothing.
- Forgetting `z.coerce` on number/date inputs.
- Rendering `err.message` from a caught server-action error. It's redacted in production.
- `useEffect` to sync form state. Use `defaultValues`, or `reset(data)` in an event handler.
- Redeclaring the Zod schema in the form file. Import it from the action's `schemas.ts`.
- `any` on an `initialData` prop. Type it from the generated DB row types once
  `pnpm supabase:typegen` has been run (`src/types/supabase.ts` doesn't exist yet).
- Adding `mode: "onChange"` reflexively. Default (validate on submit, re-validate on change) is
  right for most forms; on-change validation on a long form re-renders every keystroke.

## Known repo quirks

- **`src/components/ui/cusotm/`** is misspelled ("cusotm", not "custom"). Import paths must match the
  typo: `@/components/ui/cusotm/password-input`. Worth fixing, but fix it as its own change — it's a
  rename, not a drive-by.
- **`PasswordInput` hardcodes `data-test="password-input"`.** There is no E2E suite in the repo, so
  this attribute is inert. Don't build on it, and don't add `data-test` to new components.

## Reference

- `[Components](components.md)` — every field type with real imports, plus a complete form template
- `server-action-builder` skill — the `authAction` contract these forms submit into
