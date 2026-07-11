---
name: portal-ui
description: >
  Design system reference for the Admin Panel portal (Next.js 16 / React 19, CSS Modules, no Tailwind).
  Use this skill whenever you are building, editing, reviewing, or reviewing UI within this admin panel—new pages,
  new components, new form sections, data tables, modals, empty states, or any layout work.
  Covers the exact design tokens (CSS custom properties), typography, color palette (light + dark),
  layout shell, every shared component, accessibility conventions, and pattern rules extracted
  directly from the live codebase.
---

# Portal UI Design System

## Quick Reference

| Topic | Reference file |
|---|---|
| Colors, themes, dark mode, semantic tokens | [references/colors.md](references/colors.md) |
| Font families, size/weight scale, letter-spacing | [references/typography.md](references/typography.md) |
| Spacing, radius, borders, shadows, breakpoints, class ordering | [references/styling.md](references/styling.md) |
| App shell, sidebar, topbar, page anatomy, grid patterns | [references/layout.md](references/layout.md) |
| Every shared component with props, variants, and usage snippet | [references/components.md](references/components.md) |
| Forms, tables, modals, toasts, empty/loading/error states, nav | [references/patterns.md](references/patterns.md) |
| Focus, contrast, ARIA, keyboard behaviour | [references/accessibility.md](references/accessibility.md) |

## Essential Rules (read before writing any code)

1. **No Tailwind.** Every style lives in CSS Modules (`*.module.css`). Use existing module classes; never write inline styles for layout (inline `style` is acceptable for one-off numeric gaps like `style={{ height: 14 }}`).
2. **Reuse before creating.** All shared components live in `app/admin/ui.tsx` (server), `app/admin/Modal.tsx`, `app/admin/List.tsx`, `app/admin/FormButtons.tsx`, `app/admin/MediaField.tsx`, `app/admin/Sections.tsx`, `app/admin/StickySave.tsx`. Read [references/components.md](references/components.md) before writing a new one.
3. **CSS custom properties, not raw values.** Colors are always `var(--ink)`, `var(--primary)`, etc. Never hardcode hex except in the CSS files themselves.
4. **The engraved hairline is the only divider.** Borders come from `var(--hair-t/b/l/r)` box-shadows or the `frame` CSS class. No plain `border: 1px solid`.
5. **Icons are Hugeicons stroke-rounded, size 18 (or 16/20 where noted), strokeWidth 1.5.** Always use the `<Icon>` wrapper from `app/admin/Icon.tsx`.
6. **Dark mode is token-only.** The `data-theme="dark"` attribute on `.app` swaps every `--var` in one place. Never condition on a theme class in component code.
7. **Read the reference file for the specific topic** before starting. This SKILL.md is the router; the details live in the reference files.
