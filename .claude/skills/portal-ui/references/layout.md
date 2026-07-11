# Layout

## Table of Contents
1. [App shell](#app-shell)
2. [Sidebar](#sidebar)
3. [Topbar](#topbar)
4. [Main work area](#main-work-area)
5. [Page anatomy](#page-anatomy)
6. [Grid patterns](#grid-patterns)
7. [Do / Don't](#do--dont)

---

## App Shell

The shell is a **CSS Grid**, defined by the `.app` class in `admin.module.css`:

```css
.app {
  --side-w: 264px;
  --main-max: 1600px;
  display: grid;
  grid-template-columns: var(--side-w) minmax(0, 1fr);
  min-height: 100dvh;
  background: var(--page-bg);
  transition: grid-template-columns 320ms var(--ease-out-quint);
}

.app[data-collapsed] {
  --side-w: 72px;
}
```

`data-admin-app` and `data-theme` are always on the root `.app` element.

At **≤ 860px**: single column grid; sidebar becomes a fixed drawer.

---

## Sidebar

**Classes:** `.side`, `.sideHead`, `.brand`, `.brandAvatar`, `.brandText`, `.nav`, `.navSection`, `.navGroup`, `.navLink`, `.navIcon`, `.sideLabel`, `.sideFoot`, `.sideToggle`

```
aside.side (sticky, height 100dvh, flex column)
  ├── div.sideHead (position: relative, padding-right: 34px)
  │     ├── Link.brand  → avatar + brandText (name + "Admin · demo")
  │     └── SidebarToggle → button.sideToggle (position: absolute)
  ├── nav.nav (AdminNav) → navSection > navGroup + navLink[]
  └── div.sideFoot (cross-hatch band, 44px tall)
```

**Sidebar dimensions:**
- Expanded: `264px`
- Collapsed: `72px` (icons only + tooltips)
- Mobile drawer: `272px`

**Sidebar padding:** `16px 12px 12px`

**Nav link:** `height: 34px`, `padding: 0 10px`, `border-radius: 8px`, `font-size: 14px`. Active state: white bg + engraved shadow.

**Engraved edge:** `.side::after` draws the right-edge hairline as `background: var(--rule-highlight); box-shadow: 1px 0 0 var(--rule-shadow)`.

---

## Topbar

**Class:** `.topbar`

```
header.topbar (sticky, top 0, z-index 20, height 60px)
  ├── MenuButton (mobile only, display:none > display:inline-grid at ≤860px)
  ├── Crumbs  → p.crumbs ("Site / Projects")
  ├── span.demoTag  ("Demo data")
  └── div.topActions
        ├── ThemeToggle → button.topIcon
        ├── Reload button → button.topIcon
        ├── GitHub link → a.topIcon
        └── Author link → a.topIcon
```

**Topbar padding:** `0 max(32px, calc((100% - var(--main-max)) / 2 + 32px))`. At ≤1100px: `0 24px`. At ≤860px: `0 16px`.

**Topbar background:** `var(--glass)` + `backdrop-filter: saturate(1.4) blur(10px)`.

**Engraved bottom edge:** `.topbar::after` draws the bottom hairline.

**`.topIcon` button:** `width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface)`.

---

## Main Work Area

**Classes:** `.work`, `.main`

```
div.work (flex column, min-width: 0)
  ├── header.topbar
  └── main.main (flex column, gap: 20px, max-width: 1600px, margin-inline: auto)
        ├── PageHead
        ├── [optional] SectionNav
        └── Card[]  (or other content)
```

**`.main` padding:** `28px 32px 72px` (desktop), `24px 24px 64px` (≤1100px), `20px 16px 64px` (≤860px).

**Gap between cards:** `20px` (from `.main` `gap: 20px`).

---

## Page Anatomy

Every admin page follows this structure:

```tsx
<>
  <PageHead
    title="Projects"
    note="The work grid, in site order."
  >
    <FormModal label="Add project" …>…</FormModal>
  </PageHead>

  {/* Optional: for long pages with many cards */}
  <SectionNav items={[{ id: 'info', label: 'Info' }, …]} />

  <form action={saveAction}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card title="Details" id="info">
        <div className={s.grid2}>
          <Field label="Title" name="title" />
          <Field label="Slug" name="slug" />
        </div>
      </Card>

      <Card title="Media" flush>
        {/* flush: table or grid runs to frame edges */}
      </Card>
    </div>

    <StickySave />
  </form>
</>
```

**Page head rule:** `.pageHead::after` extends `-10px` past card edges (the rule crosses card corners).

---

## Grid Patterns

### Two-column form grid
```tsx
<div className={s.grid2}>
  <Field label="Name" name="name" />
  <Field label="Email" name="email" />
</div>
```
`grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px`
Becomes single column at ≤860px.

### Overview KPI row
Uses a custom `.kpis` grid in `overview.module.css` — 4 equal-width linked cards.

### Overview tile lattice (site content)
`.tiles` in `overview.module.css` — `repeat(auto-fill, minmax(200px, 1fr))` for navigation tiles.

### Media row (images)
`.mediaRow` in `admin.module.css` — `repeat(auto-fit, minmax(200px, 1fr)); gap: 16px`.

### Split layout (overview page)
`.split` in `overview.module.css` — two side-by-side cards (upcoming calls + this week). Typically `grid-template-columns: 1fr 1fr` or similar.

---

## Do / Don't

✅ **Do**
```tsx
// Standard page structure
<>
  <PageHead title="Clients" note="…" />
  <Card title="Logos">
    <div className={s.grid2}>…</div>
  </Card>
</>
```

❌ **Don't**
```tsx
// No custom wrappers that bypass the shell
<div className="container mx-auto px-6">…</div>

// No custom sticky headers — use SectionNav
<div style={{ position: 'sticky', top: 60, background: 'white' }}>…</div>
```
