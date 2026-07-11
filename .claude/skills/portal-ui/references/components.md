# Components

All shared components live in `app/admin/`. **Always reuse these before creating new ones.**

## Table of Contents
1. [ui.tsx — server components](#uitsx--server-components)
   - [PageHead](#pagehead)
   - [Card](#card)
   - [Field](#field)
   - [TextArea](#textarea)
   - [Select](#select)
   - [Check](#check)
   - [Actions](#actions)
   - [Empty](#empty)
2. [FormButtons.tsx — client components](#formbuttonstsx--client-components)
   - [SaveButton](#savebutton)
   - [DeleteButton](#deletebutton)
3. [Modal.tsx — client components](#modaltsx--client-components)
   - [Modal](#modal)
   - [FormModal](#formmodal)
   - [DialogButton](#dialogbutton)
   - [Toaster / toast()](#toaster--toast)
4. [List.tsx — sortable list](#listtsx--sortable-list)
   - [SortableRows](#sortablerows)
   - [Item](#item)
   - [More](#more)
5. [MediaField.tsx](#mediafield)
6. [Sections.tsx](#sectionstsx)
   - [SectionNav](#sectionnav)
   - [SectionHead](#sectionhead)
7. [StickySave.tsx](#stickysave)
8. [Icon.tsx](#icontsx)
9. [AdminNav.tsx](#adminnavtsx)
10. [RowTools.tsx](#rowtoolstsx)

---

## `ui.tsx` — server components

Imported as: `import { PageHead, Card, Field, TextArea, Select, Check, Actions, Empty, SaveButton, DeleteButton, adminStyles as s } from '../ui';`

### PageHead

Top of every admin page. Shows a Hugeicons icon, a title, an optional subtitle, and right-side action buttons.

**Props:**
```ts
{ title: string; note?: string; icon?: IconSvgElement; children?: ReactNode }
```

- `icon` defaults to the matching nav item's icon (looked up by `title`).
- `children` are rendered in `.pageActions` (right side, flex row, gap 8px).

**Usage:**
```tsx
<PageHead title="Projects" note="The work grid, in site order.">
  <FormModal label="Add project" title="New project">…</FormModal>
</PageHead>
```

---

### Card

A framed section of a page (`.card` = `.frame` + flex column). Each card is a `<section>`.

**Props:**
```ts
{
  title?: string;
  note?: string;
  id?: string;        // anchor for SectionNav links
  actions?: ReactNode; // right side of the card header
  flush?: boolean;    // body runs to frame edges (for tables / image grids)
  children: ReactNode;
}
```

- Without `title`/`note`/`actions`: no header rendered.
- `flush`: body uses `.cardFlush` (no padding); standard body uses `.cardBody` (`padding: 20px 22px 22px`).
- Card header: `padding: 15px 22px 14px`, separated by `var(--hair-b)`.

**Usage:**
```tsx
<Card title="Details" note="Basic information about this project." id="details">
  <div className={s.grid2}>
    <Field label="Title" name="title" defaultValue={row.title} />
    <Field label="Slug" name="slug" defaultValue={row.slug} />
  </div>
</Card>

<Card title="Bookings" flush>
  <div className={s.tableScroll}>
    <table className={s.table}>…</table>
  </div>
</Card>
```

---

### Field

A text input with label and optional hint. Always full-width.

**Props:**
```ts
{
  label: string;
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  type?: string;   // default "text"
  hint?: string;
  required?: boolean;
}
```

**Usage:**
```tsx
<Field label="Name" name="name" defaultValue={row.name} required />
<Field label="URL" name="url" type="url" placeholder="https://…" hint="The project's live URL." />
```

---

### TextArea

Multi-line text input with label and optional hint. Resizable vertically.

**Props:**
```ts
{ label: string; name: string; defaultValue?: string | null; hint?: string; rows?: number }
```

Min-height: `92px`. Default `rows` is unset (browser default).

**Usage:**
```tsx
<TextArea label="Description" name="description" defaultValue={row.description} rows={4} />
```

---

### Select

A `<select>` with label and optional hint.

**Props:**
```ts
{
  label: string;
  name: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  hint?: string;
}
```

**Usage:**
```tsx
<Select
  label="Status"
  name="status"
  defaultValue={row.status}
  options={[
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
  ]}
/>
```

---

### Check

A single checkbox with an inline label.

**Props:**
```ts
{ label: string; name: string; defaultChecked?: boolean }
```

**Usage:**
```tsx
<Check label="Show on homepage" name="featured" defaultChecked={row.featured} />
```

---

### Actions

A flex row (flex-wrap, gap 8px, margin-top 20px) for form buttons.

**Props:** `{ children: ReactNode }`

**Usage:**
```tsx
<Actions>
  <SaveButton />
  <DeleteButton action={deleteRow} />
</Actions>
```

---

### Empty

A framed, cross-hatch-backgrounded paragraph for empty states in lists.

**Props:** `{ children: ReactNode }`

**Usage:**
```tsx
<Empty>No testimonials yet. Add the first one above.</Empty>
```

---

## `FormButtons.tsx` — client components

### SaveButton

Primary submit button with three states: idle / "Saving…" / "Saved ✓" (1.8s then resets).

**Props:** `{ label?: string }` (default: `"Save"`)

Requires `"use client"`. Uses `useFormStatus`.

**Usage:** Inside a `<form>` alongside `<Actions>`.

```tsx
<Actions>
  <SaveButton />
</Actions>
```

---

### DeleteButton

Danger button with two-click confirmation. First click: arms it (label changes to "Click again to delete"). Second click: submits to the delete `formAction`. Auto-disarms after 3.5s.

**Props:**
```ts
{ action: (formData: FormData) => void; id?: string; label?: string }
```

**Usage:**
```tsx
<Actions>
  <SaveButton />
  <DeleteButton action={deleteProject} />
</Actions>
```

---

## `Modal.tsx` — client components

### Modal

A native `<dialog>` modal. Focus-trapped, Escape closes, click-backdrop closes.

**Props:**
```ts
{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}
```

Size: `min(720px, 100vw - 32px)` wide, `min(860px, 100dvh - 48px)` tall. `border-radius: 16px`. Modal head uses the cross-hatch `--band` background.

**Usage (low-level):**
```tsx
const [open, setOpen] = useState(false);
<Modal open={open} onClose={() => setOpen(false)} title="Edit project">
  <form>…<Actions><SaveButton /></Actions></form>
</Modal>
```

---

### FormModal

A primary button (`+ Label`) that opens a `Modal` containing a form. Auto-closes and fires a toast after `reset` (successful save).

**Props:**
```ts
{
  label: string;       // button text
  title: string;       // modal title
  description?: string;
  done?: string;       // toast message after save (default "Saved")
  defaultOpen?: boolean;
  children: ReactNode;
}
```

**Usage:**
```tsx
<FormModal label="Add project" title="New project" done="Project added">
  <form action={addProject}>
    <Field label="Title" name="title" required />
    <Actions><SaveButton label="Add" /></Actions>
  </form>
</FormModal>
```

---

### DialogButton

Like `FormModal` but the modal stays open after a save (used for the media uploader).

**Props:**
```ts
{ label: string; title: string; description?: string; primary?: boolean; children: ReactNode }
```

---

### Toaster / toast()

Renders toasts in the bottom-right corner. Fired programmatically.

```tsx
// In Shell.tsx (always present)
<Toaster />

// Call from any client component:
import { toast } from '../Modal';
toast('Project deleted');
```

Toast style: dark bg (`var(--toast-bg)`), 13px bold text, green check SVG icon, `border-radius: 10px`, disappears after 2.6s.

---

## `List.tsx` — sortable list

### SortableRows

Wraps a collection in a DnD context (dnd-kit) + ARIA announcements. Persists the new order to the server immediately on drop or button-move.

**Props:**
```ts
{
  table: string;     // DB table name for save
  ids: string[];     // row IDs in server order
  scope?: number;    // for multi-section lists (client logos)
  label?: string;    // e.g. "questions" (for screen reader announcements)
  children: ReactNode;
}
```

**Usage:**
```tsx
<SortableRows table="faqs" ids={rows.map(r => r.id)} label="questions">
  {rows.map(row => (
    <Item key={row.id} id={row.id} title={row.question} meta={`${row.answer.slice(0, 60)}…`}>
      <form action={saveFaq}>
        <Field label="Question" name="question" defaultValue={row.question} />
        <TextArea label="Answer" name="answer" defaultValue={row.answer} />
        <Actions>
          <SaveButton />
          <DeleteButton action={deleteFaq} />
        </Actions>
      </form>
    </Item>
  ))}
</SortableRows>
```

---

### Item

A single sortable row: drag handle, position number, optional thumbnail, a button that opens an edit modal, and up/down/top/bottom buttons.

**Props:**
```ts
{
  id: string;
  title: string;
  meta?: string;          // secondary line
  thumb?: string | null;  // image or video URL
  editTitle?: string;     // modal title (default "Edit <title>")
  children: ReactNode;    // form inside the modal
}
```

---

### More

A `<details>`/`<summary>` for optional/advanced fields within a form.

**Props:** `{ label?: string; children: ReactNode }` (label default: `"More options"`)

---

## `MediaField.tsx`

An image/video picker: drag-and-drop zone, file browse, library picker (reuse already-uploaded). Stores a key (not a URL) in a hidden `<input>`.

**Props:**
```ts
{
  label: string;
  name: string;
  defaultValue?: string | null;
  hint?: string;
  accept?: string;         // MIME types
  shape?: 'wide' | 'square'; // default 'wide'
  max?: number;            // max image side in px
}
```

**Usage:**
```tsx
<MediaField
  label="Cover image"
  name="cover"
  defaultValue={row.cover}
  shape="wide"
  max={1200}
  hint="1200 × 800px recommended. Converted to WebP."
/>
```

---

## `Sections.tsx`

### SectionNav

A sticky subnav (below the topbar, top: 60px) with anchor links to each card on the page. Rendered before the `<form>` on long pages.

**Props:** `{ items: { id: string; label: string }[] }`

**Usage:**
```tsx
<SectionNav items={[
  { id: 'brand', label: 'Brand' },
  { id: 'hero', label: 'Hero' },
  { id: 'seo', label: 'SEO' },
]} />
```

---

### SectionHead

A heading for a sub-section of a page (not inside a Card). Uses `--font-display` at 20px.

**Props:** `{ title: string; note?: string; id?: string; children?: ReactNode }`

---

## `StickySave.tsx`

A sticky save bar pinned to the page bottom for long settings forms. Shows "Unsaved changes" / "All changes saved" with a colour-changing dot, a Discard button, and `<SaveButton>`. Warns on unload if dirty.

**Props:** `{ label?: string }` (default: `"Save changes"`)

**Usage:** Inside the `<form>`, as the last element.

```tsx
<form action={saveSettings}>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <Card title="Brand">…</Card>
    <Card title="SEO">…</Card>
  </div>
  <StickySave />
</form>
```

---

## `Icon.tsx`

Renders a Hugeicons stroke-rounded icon (strokeWidth 1.5, `aria-hidden`).

**Props:** `{ icon: IconSvgElement; size?: number; className?: string }`

Default size: `18`. Common sizes: `16` (button icons), `18` (nav, topbar), `20` (page icon, tile icon).

**Usage:**
```tsx
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon';
import { Icon } from '../Icon';

<Icon icon={Folder01Icon} size={18} />
```

---

## `AdminNav.tsx`

Three sub-components used in the shell (not in pages):
- **`AdminNav`** — the sidebar nav links (grouped, with active state).
- **`Crumbs`** — breadcrumb in the topbar (`"Site / Projects"`).
- **`MenuButton`** — hamburger button (mobile only).
- **`MenuScrim`** — backdrop that closes the mobile drawer.

---

## `RowTools.tsx`

A `<span>` that stops click/keydown propagation. Used inside `<summary>` elements to prevent reorder buttons from toggling the `<details>` open.

**Props:** `{ className?: string; children: ReactNode }`
