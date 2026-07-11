# Styling

## Table of Contents
1. [Styling approach](#styling-approach)
2. [Spacing scale](#spacing-scale)
3. [Border radius](#border-radius)
4. [Shadows](#shadows)
5. [Borders](#borders)
6. [Transitions](#transitions)
7. [Breakpoints](#breakpoints)
8. [CSS conventions](#css-conventions)
9. [Do / Don't](#do--dont)

---

## Styling Approach

- **CSS Modules only.** No Tailwind, no styled-components, no inline style for layout. Inline `style` is acceptable for one-off numeric gaps (e.g. `style={{ height: 14 }}`).
- All admin styles live in `admin.module.css`. Page-specific styles are in `<page>.module.css` files.
- CSS custom properties from `globals.css` are the source of truth for all design tokens.
- The `composes` keyword is used in some places (e.g. `.card` composes `.frame`); do not break these chains.

---

## Spacing Scale

The portal does not use a rigid 4px/8px grid — it uses intentional fixed values. Common values seen:

| Value | Usage |
|---|---|
| 2px | Tiny gap (nav items, badge padding) |
| 4px | Small badge padding, nav section gap |
| 6px | Button icon gap, small row gap |
| 8px | Standard gap (actions row, tags, topbar gap) |
| 10px | Nav link padding, sidebar padding, tooltip padding |
| 12px | Sidebar padding, form actions margin-top (partial) |
| 14px | Card header padding, table cell padding, button side padding |
| 16px | Main section gap (page cards), card head gap, grid gap |
| 20px | Main gap (cards stack), card body padding |
| 22px | Card body/modal body padding |
| 24px | Login padding, topbar/modal responsive padding |
| 28px | Main area top padding (desktop) |
| 32px | Main area side padding (desktop) |
| 72px | Main area bottom padding |

**Page main padding:** `28px 32px 72px` (desktop), `24px 24px 64px` (≤1100px), `20px 16px 64px` (≤860px)

---

## Border Radius

| Value | Used on |
|---|---|
| `6px` | Thumbnails, keyboard shortcut badge, tooltip |
| `7px` | Open-row button, size select |
| `8px` | Buttons (`.btn`, `.iconBtn`), inputs, selects, sidebar nav links, topbar icon buttons, filter facets, sidebar toggle |
| `10px` | Menu panel popup, notice/error block, toast, sidebar toggle (modal on mobile: 0) |
| `16px` | Modal dialog |
| `50%` | Avatar, status dot |
| `999px` | Pills, tags, status badges, demo tag |

---

## Shadows

| Token / Value | Used on |
|---|---|
| `var(--ring)` | Focus ring on inputs and buttons |
| `var(--raise)` | Active nav link |
| `var(--pop-ring)` + `var(--pop-shadow)` | Modal, menu panel, toast |
| `var(--hair-t/b/l/r)` | Engraved hairline dividers |
| `0 0 0 2px var(--avatar-ring)` | Sidebar avatar ring |
| `0 4px 12px rgba(0,0,0,0.15)` | Collapsed sidebar tooltip |
| `20px 0 60px rgba(0,0,0,0.12)` | Mobile drawer shadow |

---

## Borders

The portal **does not use `border: 1px solid`** as a divider. Instead:
- **Engraved hairline** (`box-shadow: var(--hair-b)`) for horizontal rules between sections, table rows, card headers.
- **`border: 1px solid var(--border)`** only on interactive elements: inputs, selects, buttons, `iconBtn`.
- **`border: 1px solid transparent`** on nav links and sidebar toggle (becomes visible on hover via `border-color` transition).
- The `.frame` class draws the 4-corner engraved frame using `::before` with 8 background gradients.

---

## Transitions

All transitions use `var(--ease-out-quint)` = `cubic-bezier(0.33, 1, 0.68, 1)`.

Common durations:
| Duration | Used for |
|---|---|
| `160ms` | Color/bg hover on buttons, inputs, nav links, table rows |
| `200ms` | Nav group label opacity |
| `240ms` | Modal backdrop fade, toast icon |
| `260ms` | Sidebar label slide |
| `320ms` | Sidebar width, sidebar collapse animation, modal entrance, mobile drawer |
| `340ms` | Side panel entrance |
| `520ms` | Spring animations (sidebar toggle icon, theme toggle) — uses `cubic-bezier(0.34, 1.56, 0.64, 1)` |

`prefers-reduced-motion: reduce` sets all animation and transition to `0.01ms`.

---

## Breakpoints

| Breakpoint | Behaviour |
|---|---|
| `> 1100px` (default) | Sidebar 264px wide, main padding `28px 32px 72px` |
| `≤ 1100px` | Main padding `24px 24px 64px`, topbar padding `0 24px` |
| `≤ 860px` | Sidebar becomes a fixed drawer (slides from left), menu button appears in topbar, `grid2` becomes single column, modal goes full-screen |

---

## CSS Conventions

1. **Property ordering** follows a logical grouping: position → display/flex → sizing → margin/padding → border → background → typography → color → transitions.
2. **Module class composition**: `composes: frame;` to inherit the frame drawing without duplicating. `composes: topIcon;` in `themeToggle`.
3. **State via data-attributes** (not extra classes): `data-active`, `data-collapsed`, `data-theme`, `data-dirty`, `data-armed`, `data-selected`, `data-open`, `data-stage`, `data-on`.
4. **Utility class** from module: pages import `adminStyles as s` from `ui.tsx` and use `s.btn`, `s.btnPrimary`, `s.table`, etc. to share the same classes across pages without importing the CSS file directly.
5. **`min-width: 0`** on all flex children that may overflow (grid columns, sidebar, work area).
6. **`overscroll-behavior: contain`** on scrollable containers (sidebar nav, modal body, panel body).

---

## Do / Don't

✅ **Do**
```tsx
// Use module classes
<div className={styles.card}>…</div>

// Inline only for one-off numeric gaps
<div style={{ height: 14 }} />

// Data-attributes for state
<button data-armed={armed || undefined}>…</button>
```

❌ **Don't**
```tsx
// No hardcoded colors
<div style={{ background: '#efefef' }}>…</div>

// No Tailwind
<div className="flex gap-4 p-6 rounded-lg">…</div>

// No border as a divider
<div style={{ borderBottom: '1px solid #e3e3e3' }}>…</div>
// → use box-shadow: var(--hair-b) instead
```
