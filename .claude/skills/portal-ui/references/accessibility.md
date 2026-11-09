# Accessibility

> Source names, paths, selectors, and imports are examples. Apply these design rules in the target project as described in [the skill](../SKILL.md#applying-the-system-in-a-target-project); do not assume the original admin code exists.

## Rules
1. **Hugeicons are always `aria-hidden`.** The `<Icon>` wrapper adds `aria-hidden` automatically. Provide an `aria-label` on the surrounding button instead.
2. **Interactive elements always have visible focus styles** — either `outline` or `box-shadow: var(--ring)`. Never suppress focus without a replacement.
3. **`role="status"` and `aria-live="polite"`** on loading placeholders and the toast container.
4. **`aria-current="page"`** on the active nav link.
5. **`prefers-reduced-motion`** degrades all animations to `0.01ms`. This is handled globally in `globals.css` and specifically for admin animations in `admin.module.css`.

---

## Focus States

### Inputs, textareas, selects
```css
.input:focus,
.textarea:focus,
.select:focus {
  outline: none;
  border-color: var(--ink-soft);
  box-shadow: var(--ring);
}
```
`--ring` = `0 0 0 3px rgba(25,25,25,0.1)` (light) / `0 0 0 3px rgba(99,80,255,0.35)` (dark).

### Buttons (`.btn`, `.iconBtn`)
```css
.btn:focus-visible,
.iconBtn:focus-visible {
  outline: none;
  box-shadow: var(--ring);
}
```

### Nav links, sidebar brand, sidebar toggle
```css
.navLink:focus-visible,
.brand:focus-visible,
.sideToggle:focus-visible {
  outline: 2px solid var(--ink-soft);
  outline-offset: 1px;
}
```

### Tab buttons (table.module.css)
```css
.tab:focus-visible {
  outline: 2px solid var(--ink-soft);
  outline-offset: -4px;
}
```

### Sort buttons, open-row buttons, link buttons (table.module.css)
```css
.facet:focus-visible,
.sort:focus-visible,
.openBtn:focus-visible,
.link:focus-visible {
  outline: 2px solid var(--ink-soft);
  outline-offset: 1px;
}
```

### Table rows (keyboard navigation)
```css
.row:focus-visible td {
  background: var(--lift);
}
.row:focus-visible td:first-child {
  box-shadow: inset 2px 0 0 var(--ink-soft), var(--hair-b);
}
```

---

## Keyboard Behaviour

| Component | Keyboard |
|---|---|
| Modal (`<dialog>`) | Esc closes; focus trapped inside; focus returns to opener |
| Table rows (`tabIndex={0}`) | Enter / Space opens the detail panel |
| Sortable list handles | Space picks up; arrows move; Space drops; Escape cancels |
| Sidebar toggle (collapsed) | Shows tooltip on `:focus-visible` same as hover |
| Search box | `/` key anywhere on the bookings page jumps focus to search |
| Tab list | Uses `role="tablist"` / `role="tab"` / `aria-selected` |

---

## ARIA Conventions

### Buttons with only icons
```tsx
<button className={s.iconBtn} aria-label="Delete photo">
  <Icon icon={TrashIcon} size={16} />
</button>
```

### Links with only icons  
```tsx
<a className={s.topIcon} href={url} aria-label="The code on GitHub" title="Code on GitHub">
  <Icon icon={GithubIcon} size={18} />
</a>
```

### Navigation landmark
```tsx
<nav className={styles.nav} aria-label="Admin">…</nav>
<nav className={styles.sectionNav} aria-label="On this page">…</nav>
```

### Active nav link
```tsx
<Link aria-current={isActive ? 'page' : undefined} data-active={isActive || undefined} …>
```

### Dynamic regions
```tsx
<div className={styles.toaster} role="status" aria-live="polite">…</div>
<div className={styles.loginCard} role="status" aria-live="polite">…</div>
```

### Table sort headers
```tsx
<th aria-sort={isActive ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
  <button className={t.sort}>Name <Icon icon={ArrowUpDownIcon} size={13} /></button>
</th>
```

### Drag-and-drop announcements (List.tsx)
```tsx
accessibility={{
  screenReaderInstructions: { draggable: 'To reorder, press Space. Use the arrow keys to move, Space to drop, Escape to cancel.' },
  announcements: {
    onDragStart: ({ active }) => `Picked up, place ${place(active.id)} of ${order.length} ${label}.`,
    onDragOver: ({ over }) => over ? `Over place ${place(over.id)}.` : 'Not over a place.',
    onDragEnd: ({ over }) => over ? `Dropped at place ${place(over.id)}.` : 'Dropped.',
    onDragCancel: () => 'Cancelled.',
  },
}}
```

### Checkbox columns in tables
```tsx
<input
  type="checkbox"
  aria-label="Select every booking on this page"
  checked={allOnPage}
  ref={el => { if (el) el.indeterminate = !allOnPage && someOnPage; }}
/>
```

---

## Colour Contrast

- Body text (`--ink-soft` on `--page-bg`): `rgb(25,25,25)` on `rgb(245,245,245)` → high contrast.
- Secondary text (`--soft` on `--page-bg`): `#6b6b6b` on `#f5f5f5` → ≈4.6:1, passes AA.
- `--faint` (`#8f8f8f` on `#f5f5f5`) → ≈2.8:1 — used only for non-essential decorative text (timestamps, separators). Do not use for interactive labels or required information.
- Primary button: `--on-primary` (#fff) on `--primary` (#191919 light / #3b1fe5 dark) → high contrast.
- Status badges always pair light bg with darker text (e.g. `--ok-bg` + `--ok`).
- Dark mode adjusts `--ok`, `--bad`, `--warn` to lighter shades for contrast on dark grounds.

---

## Do / Don't

✅ **Do**
```tsx
// Icon button with aria-label
<button className={s.iconBtn} aria-label="Close dialog" onClick={onClose}>
  <Icon icon={CancelIcon} size={14} />
</button>

// Form field with linked label
<label className={styles.label} htmlFor={name}>{label}</label>
<input id={name} name={name} … />

// Loading region
<div role="status" aria-live="polite">Loading…</div>
```

❌ **Don't**
```tsx
// Missing aria-label on icon-only buttons
<button onClick={onClose}><Icon icon={CancelIcon} /></button>

// Suppressing focus without a replacement
<button style={{ outline: 'none' }}>Save</button>

// Using --faint for required labels
<label style={{ color: 'var(--faint)' }}>Name *</label>
```
