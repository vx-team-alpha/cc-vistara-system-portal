# UI Components & Styling

## Dashboard design system

For dashboard UI work, use the repository's [`portal-ui` skill](../../.claude/skills/portal-ui/SKILL.md) as the visual source of truth. Read the relevant topic references before editing, and keep the skill's exact fonts, type scale, color/theme tokens, layout, spacing, and component patterns consistent across dashboard pages. The generic Tailwind/shadcn notes below apply only where they do not conflict with the dashboard skill. Use the existing app architecture and framework conventions where skill examples describe files or components not present in this repository.

## Skills

For forms:

- `/react-form-builder` - Forms with validation and server actions

## Import Convention

Always use `@/components/ui/{component}`:

```tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
```

## Styling

- Tailwind CSS v4 with semantic classes
- Prefer: `bg-background`, `text-muted-foreground`, `border-border`
- Use `cn()` for class merging
- Never use hardcoded colors like `bg-white`

## Key Components

| Component | Usage               |
| --------- | ------------------- |
| `toast`   | Notifications       |
| `Form*`   | Form fields         |
| `Button`  | Actions             |
| `Card`    | Content containers  |
| `Alert`   | Error/info messages |

## Conditional Rendering

## Testing Attributes

Always add `data-test` for E2E:

```tsx
<button data-test="submit-button">Submit</button>
```

## Form Guidelines

- Use `react-hook-form` with `zodResolver`
- Never add generics to `useForm`
- Use `useWatch` instead of `watch()`
- Always include `FormMessage` for errors
