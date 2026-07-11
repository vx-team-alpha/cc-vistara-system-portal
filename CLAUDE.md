# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Critical: Next.js 16 has breaking changes

This project runs **Next.js 16.2** and **React 19.2**. APIs and conventions differ from older Next.js. Version-accurate docs are bundled locally at `node_modules/next/dist/docs/` (`01-app/` is the App Router reference). Read the relevant page there before writing framework code — do not rely on training-data knowledge of Next.js.

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml` / `pnpm-workspace.yaml`).

```bash
pnpm dev      # dev server at http://localhost:3000
pnpm build    # production build
pnpm start    # serve the production build
pnpm lint     # eslint (flat config)
```

There is no test runner configured yet.

## Dashboard UI

For all dashboard UI work under `src/app/home/` and dashboard components in `src/components/`, follow the local [`portal-ui` skill](.claude/skills/portal-ui/SKILL.md) as the source of truth for visual design. Read the relevant reference before editing: `colors.md`, `typography.md`, `styling.md`, `layout.md`, `components.md`, `patterns.md`, and `accessibility.md` cover the exact font families and scale, color tokens and themes, spacing, shell, reusable patterns, and interaction rules. Match the skill consistently across dashboard pages; do not substitute the generic shadcn/Tailwind guidance below for its visual rules. Use the existing app architecture and framework conventions where the skill's implementation examples describe files or components not present in this repository.

## Architecture

- **App Router only**, sourced from `src/app/` with the `@/*` → `./src/*` path alias (`tsconfig.json`). `layout.tsx` is the root layout; loads Geist fonts via `next/font/google` and exposes them as the `--font-geist-sans` / `--font-geist-mono` CSS variables.
- **Tailwind CSS v4** is configured CSS-first — there is **no `tailwind.config.js`**. Theme tokens live in `src/app/globals.css` inside `@theme inline { ... }`, and the framework is pulled in via `@import "tailwindcss"` plus the `@tailwindcss/postcss` plugin (`postcss.config.mjs`). Add/adjust design tokens in `globals.css`, not a JS config.
- **Supabase local development** is scaffolded in `supabase/` (untracked; `config.toml` only, no migrations yet). Run against the Supabase CLI local stack (default API port `54321`).
- `pnpm-workspace.yaml` marks `sharp` and `unrs-resolver` as ignored built dependencies, so their install scripts are skipped by default.
