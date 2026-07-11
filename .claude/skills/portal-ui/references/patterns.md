# Patterns

## Table of Contents
1. [Forms](#forms)
2. [Tables](#tables)
3. [Modals](#modals)
4. [Empty states](#empty-states)
5. [Loading states](#loading-states)
6. [Error states](#error-states)
7. [Toasts](#toasts)
8. [Navigation](#navigation)
9. [Status badges](#status-badges)
10. [Tags](#tags)
11. [Pagination](#pagination)

---

## Forms

### Standard settings form (long page)

```tsx
"use client";
import { PageHead, Card, Field, TextArea, Select, adminStyles as s } from '../ui';
import { SectionNav } from '../Sections';
import { StickySave } from '../StickySave';
import { saveSettings } from '../actions';

export default function SettingsPage() {
  return (
    <>
      <PageHead title="Text & labels" note="The one-off strings across the site." />

      <SectionNav items={[
        { id: 'brand', label: 'Brand' },
        { id: 'seo', label: 'SEO' },
      ]} />

      <form action={saveSettings}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card title="Brand" id="brand">
            <div className={s.grid2}>
              <Field label="Site name" name="brand.name" defaultValue={v['brand.name']} />
              <Field label="Tagline" name="brand.tagline" defaultValue={v['brand.tagline']} />
            </div>
          </Card>

          <Card title="Search & sharing" id="seo">
            <Field label="Page title" name="seo.title" defaultValue={v['seo.title']} />
            <div style={{ height: 14 }} />
            <TextArea label="Description" name="seo.description" defaultValue={v['seo.description']} rows={3} />
          </Card>
        </div>

        <StickySave />
      </form>
    </>
  );
}
```

**Inter-field spacing in a card body:** use `<div style={{ height: 14 }} />` between unrelated field groups.

### Edit form inside a modal (via List.Item)

```tsx
<Item id={row.id} title={row.name}>
  <form action={saveRow}>
    <input type="hidden" name="id" value={row.id} />
    <Field label="Name" name="name" defaultValue={row.name} required />
    <TextArea label="Body" name="body" defaultValue={row.body} rows={4} />
    <Actions>
      <SaveButton />
      <DeleteButton action={deleteRow} />
    </Actions>
  </form>
</Item>
```

### Add form (FormModal)

```tsx
<FormModal label="Add plan" title="New pricing plan" done="Plan added">
  <form action={addPlan}>
    <div className={s.grid2}>
      <Field label="Name" name="name" required />
      <Field label="Price" name="price" placeholder="$2,400" />
    </div>
    <div style={{ height: 14 }} />
    <TextArea label="Features" name="features" rows={4} hint="One per line." />
    <Actions>
      <SaveButton label="Add plan" />
    </Actions>
  </form>
</FormModal>
```

---

## Tables

### Standard table (admin.module.css)

Used on simple pages (overview bookings preview).

```tsx
<Card title="Recent bookings" flush>
  <div className={s.tableScroll}>
    <table className={s.table}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th className={s.num}>Count</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}>
            <td>{r.name}</td>
            <td>{r.email || <span className={s.muted}>—</span>}</td>
            <td className={s.num}>{r.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</Card>
```

**Rules:**
- Table always in a `Card` with `flush`.
- Scroll wrapper: `div.tableScroll` (overflow-x auto).
- `th`: `height: 38px`, `--band` background (cross-hatch), `11px` uppercase, `box-shadow: var(--hair-b), var(--hair-r)`. Last `th` has no right hair.
- `td`: `padding: 12px 14px`, `box-shadow: var(--hair-b)`. Last row's `td` has no hair.
- Numeric column: `className={s.num}` (right-aligned, tabular nums).
- Missing/null values: `<span className={s.muted}>—</span>`.
- Row hover: automatic (`table tbody tr:hover td { background: var(--lift) }`).

### Full-featured data table (table.module.css)

The `BookingsTable` pattern — tabs + search + filters + sort + paginate. Copy this pattern for any CRM-style page.

Key pieces:
```tsx
<div className={`${t.board} ${s.frame}`}>
  {/* tabs + tools */}
  <div className={t.bar}>
    <div className={t.tabs} role="tablist">
      <button role="tab" aria-selected={tab === 'all'} className={t.tab}>
        All <span className={t.tabCount}>{counts.all}</span>
      </button>
    </div>
    <div className={t.tools}>
      <label className={t.search}>
        <Icon icon={Search01Icon} size={16} />
        <input type="search" placeholder="Search…" />
      </label>
    </div>
  </div>

  {/* filters */}
  <div className={t.filters}>
    {/* Facet buttons */}
  </div>

  {/* table */}
  <div className={t.scroll}>
    <table className={t.table}>…</table>
  </div>

  {/* pagination foot */}
  <div className={t.foot}>
    <span>1–25 of 300</span>
    <span className={t.pager}>
      <button className={s.iconBtn} disabled={page === 0}>←</button>
      <span className={t.pageNo}>{page + 1} / {pages}</span>
      <button className={s.iconBtn} disabled={page >= pages - 1}>→</button>
    </span>
  </div>
</div>
```

---

## Modals

### Low-level Modal

```tsx
const [open, setOpen] = useState(false);

<button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setOpen(true)}>
  Open
</button>

<Modal open={open} onClose={() => setOpen(false)} title="Settings" description="Adjust your preferences.">
  {/* Form or content */}
  <div style={{ paddingBottom: 22 }}>…</div>
</Modal>
```

### FormModal (preferred for add-item flows)

See [components.md → FormModal](components.md).

**Sticky form buttons inside modal:** Put `<Actions>` inside `<div className={styles.modalBody}>`. CSS pins `.modalBody .actions` to the bottom with `position: sticky; bottom: 0`.

---

## Empty States

### In a List (`.empty` class)

```tsx
<Empty>No FAQs yet. Add the first question above.</Empty>
```

Renders a `.frame` paragraph with cross-hatch background, centered, `padding: 36px 24px`, `color: var(--soft)`.

### In a table cell (`.none` class from table.module.css)

```tsx
<tr>
  <td colSpan={cols} className={t.none}>
    <strong>No bookings yet.</strong> They appear here the moment someone books.
  </td>
</tr>
```

Padding: `48px 20px`, cross-hatch background.

### In a card body

```tsx
<Card title="Projects" flush>
  {rows.length === 0 ? (
    <p className={s.empty}>No projects yet.</p>
  ) : (
    <SortableRows …>…</SortableRows>
  )}
</Card>
```

---

## Loading States

The shell shows a loading card while the demo database initialises (Shell.tsx):

```tsx
<div className={styles.loginCard} role="status" aria-live="polite">
  <h1 className={styles.loginTitle}>Opening the admin</h1>
  <p className={styles.loginNote}>Loading…</p>
</div>
```

Individual pages do not have loading skeletons — data arrives synchronously from the in-browser DB. For server-action pending states, use `useFormStatus` in `SaveButton`.

---

## Error States

### Field-level validation error

```tsx
<div className={s.guard}>
  {/* shown only when non-empty (guard:empty { display: none }) */}
  {error}
</div>
```

### Notice (block error in a card)

```tsx
<div className={s.notice}>
  Could not load the media library. Please refresh.
</div>
```

`background: var(--bad-bg); color: var(--bad); border-radius: 10px; padding: 12px 14px; font-size: 13px`.

---

## Toasts

```tsx
import { toast } from '../Modal';
toast('Project saved');    // success
toast('Could not delete. Try again.');  // error (same style — plain text)
```

The `<Toaster />` in Shell.tsx handles rendering. Toasts auto-dismiss after 2.6s, max 3 visible at once.

---

## Navigation

### Sidebar nav (from nav.ts)

Nav items are defined in `app/admin/nav.ts` as `NAV: NavGroup[]`. Each item has `href`, `label`, `icon` (Hugeicons), and `note`.

To add a page to the nav: add an entry to `NAV` in `nav.ts`. The sidebar, breadcrumb, page icon, and overview grid all pull from that single source.

### SectionNav (page-level)

For long pages. See [components.md → SectionNav](components.md).

### Breadcrumb

Auto-generated by `<Crumbs />` in the topbar. No manual breadcrumb needed.

---

## Status Badges

```tsx
// Upcoming call
<span className={t.status} data-stage="upcoming">
  <i aria-hidden /> Upcoming
</span>

// Past
<span className={t.status} data-stage="past">
  <i aria-hidden /> Past
</span>

// Cancelled
<span className={t.status} data-stage="cancelled">
  <i aria-hidden /> Cancelled
</span>

// Warning
<span className={t.status} data-stage="unscheduled">
  <i aria-hidden /> No time yet
</span>
```

The `<i>` renders a 6px coloured dot. Colours come from the data-stage attribute.

---

## Tags

```tsx
// Plain tag (interest, category)
<span className={t.tag}>Design</span>

// Hue-keyed tag (colour assigned deterministically by word)
<span className={t.tag} data-hue="green">Design</span>

// Tag group
<span className={t.tags}>
  <span className={t.tag} data-hue="blue">UI</span>
  <span className={t.tag} data-hue="violet">Motion</span>
</span>
```

Available hues: `green`, `blue`, `violet`, `orange`, `cyan`, `yellow`, `lime`.

Pill variant (generic, in admin.module.css):
```tsx
<span className={s.pill}>3 projects</span>
```

---

## Pagination

```tsx
<div className={t.foot}>
  <span>
    {from}–{to} of {total}
    {filtered !== total && <span className={s.muted}> · {total} in all</span>}
  </span>
  <span className={t.pager}>
    <label className={t.size}>
      Rows
      <select value={size} onChange={e => setSize(Number(e.target.value))}>
        {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
    <button className={s.iconBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page">
      <Icon icon={ArrowLeft01Icon} size={16} />
    </button>
    <span className={t.pageNo}>{page + 1} / {pages}</span>
    <button className={s.iconBtn} disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} aria-label="Next page">
      <Icon icon={ArrowRight01Icon} size={16} />
    </button>
  </span>
</div>
```
