---
name: portal-ui
description: >
  Apply the Portal UI design system when building, editing, or reviewing pages,
  portals, dashboards, components, and other web UI in any project. Use when the
  user selects portal-ui or asks for this design system, regardless of route,
  directory, page name, or framework. Covers visual tokens, typography, light and
  dark themes, layout, components, interaction patterns, and accessibility.
---

# Portal UI Design System

## Purpose and Scope

Selecting this skill makes the bundled design system the visual specification for the requested UI. Apply it at any route or file path, including public pages, customer portals, authentication screens, and admin pages. Neither an `/admin` route nor an existing portal implementation is required.

The references were extracted from an Admin Panel built with Next.js, React, and CSS Modules. Names such as `app/admin/`, `admin.module.css`, `../ui`, `.app`, and `data-admin-app` describe that source implementation; they are not required locations, imports, or product identities. Resolve all reference links relative to this skill directory. The bundled references are the design authority even when the original source files are absent.

Apply the system throughout the user's requested scope. A single-page request does not authorize a whole-project redesign. For a project-wide request, establish shared foundations and apply them across the requested routes. Preserve the product's content, navigation destinations, data, and working behavior while changing its presentation.

## Applying the System in a Target Project

1. Inspect the requested UI, its layout ancestors, shared components, styles, installed dependencies, and project instructions. Locate the actual files instead of guessing paths from the examples. Follow the installed framework's conventions; this skill does not require a framework migration.
2. Read colors, typography, and styling for visual work; read layout for pages or shells, and components, patterns, and accessibility for the controls and interactions being changed.
3. Map the reference tokens and component roles to the target project. Reuse components that match the system; adapt or implement missing primitives in the project's shared UI location. Never import a source-example module unless it exists in the target project. Treat documented props as example APIs, not proof of installed exports.
4. Establish the required tokens, font stacks, styles, and primitives before composing the page. Keep theme tokens scoped to the intended UI root when the surrounding project is outside the request. Ensure dialogs or popovers rendered elsewhere inherit the same theme tokens.
5. Compose the UI for its actual purpose. Reuse the reference shell when a portal shell is needed; do not add a sidebar, demo branding, admin labels, GitHub links, or settings actions solely because an example contains them. A standalone page or component still uses the same visual language.
6. Verify the result against the relevant references: palette and surfaces, type scale, spacing, engraved dividers, control shapes, icon treatment, responsive layout, theme states, focus and keyboard behavior. Use the project's applicable checks and report any unavailable assets or validation limits.

## Quick Reference

| Topic                                                          | Reference file                                             |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| Colors, themes, dark mode, semantic tokens                     | [references/colors.md](references/colors.md)               |
| Font families, size/weight scale, letter-spacing               | [references/typography.md](references/typography.md)       |
| Spacing, radius, borders, shadows, breakpoints, class ordering | [references/styling.md](references/styling.md)             |
| App shell, sidebar, topbar, page anatomy, grid patterns        | [references/layout.md](references/layout.md)               |
| Every shared component with props, variants, and usage snippet | [references/components.md](references/components.md)       |
| Forms, tables, modals, toasts, empty/loading/error states, nav | [references/patterns.md](references/patterns.md)           |
| Focus, contrast, ARIA, keyboard behaviour                      | [references/accessibility.md](references/accessibility.md) |

## Essential Design Rules

1. **Preserve the visual system.** Use the reference token values, Roobert/Geist type roles, exact type scale and tracking, muted ground surfaces, engraved hairlines, compact controls, spacing, radii, and motion. Do not substitute a generic dashboard theme or default component-library styling.
2. **Use CSS Modules for React implementations.** Keep layout in stylesheets, not inline styles or Tailwind utilities. For a framework without CSS Modules, use its supported scoped or plain CSS equivalent with the same tokens and values. Existing Tailwind elsewhere does not require removing it or changing the build setup.
3. **Reuse before creating.** Read [references/components.md](references/components.md), then locate equivalent target components. If missing, implement only the shared primitives needed for the task. The skill does not bundle the original component implementations or CSS files.
4. **Use semantic CSS custom properties.** Components consume `var(--ink)`, `var(--primary)`, and the other reference tokens; literal palette values belong in token definitions. Define every consumed token. The dark-theme table lists key overrides, not a complete ready-to-copy theme; supply appropriate overrides for other affected tokens and check their contrast.
5. **Use engraved dividers and frames.** Use `--hair-t/b/l/r` shadows and the frame treatment for structural lines. Plain token-based borders remain appropriate for interactive controls as documented in styling.
6. **Use Hugeicons stroke-rounded icons** through a shared accessible wrapper: normally 18px, 16/20px where specified, stroke width 1.5. Reuse the wrapper if available or implement it locally. Resolve actual installed exports rather than copying example import paths blindly.
7. **Keep themes in tokens.** Put `data-theme="dark"` on the target UI root and override tokens there; do not branch component rendering for theme colors. Preserve the target project's theme persistence behavior.
8. **Load fonts through the target framework's supported mechanism.** Use available Roobert and Geist assets and the documented CSS stacks. Do not assume source font files or Next.js `localFont` exist. If an asset is unavailable, use the documented fallback stack and disclose that limitation.

## Example Code

[references/sample-page.tsx](references/sample-page.tsx) illustrates page composition, not an installable template. Its imports, database hook, actions, labels, and demo data belong to the source example. Adapt the composition to real target components and behavior; never create a route or backend just to satisfy those imports. Examples do not override the stylesheet and token rules above.
