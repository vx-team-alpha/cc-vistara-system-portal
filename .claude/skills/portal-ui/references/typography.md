# Typography

> Source names, paths, selectors, and imports are examples. Apply these design rules in the target project as described in [the skill](../SKILL.md#applying-the-system-in-a-target-project); do not assume the original admin code exists.

## Rules

- Two font families: **Roobert** (display/headings) and **Geist** (body/interface). Expose both through CSS variables using the target framework's font loader or `@font-face` (the source used Next.js `localFont`); use the CSS tokens, not the font names directly.
- Letter-spacing is almost always **negative** on display text (tracking tightening). Match the exact values below — do not approximate with `-0.05em`.
- Line-height is `1.6` for body text, `1.2`–`1.5` for headings and notes.
- Font features: `"blwf" 1, "cv03" 1, "cv04" 1, "cv09" 1, "cv11" 1` are set globally on `<body>`.
- `-webkit-font-smoothing: antialiased` is set globally; do not add it again.

---

## Font Families

| Token            | Stack                                                           | Use                                                      |
| ---------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| `--font-display` | `var(--font-roobert), var(--font-geist), system-ui, sans-serif` | Page titles, modal titles, section headings, login title |
| `--font-body`    | `var(--font-geist), system-ui, sans-serif`                      | Everything else (interface, labels, inputs, table text)  |

```css
/* globals.css */
body {
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.6;
}
```

---

## Type Scale (extracted from admin.module.css & Sections.module.css)

| Element                                | Size    | Weight | Letter-spacing | Line-height | Font family                  |
| -------------------------------------- | ------- | ------ | -------------- | ----------- | ---------------------------- |
| Page title (`h1`)                      | 26px    | 500    | `-0.78px`      | 1.2         | `--font-display`             |
| Page title on mobile                   | 22px    | 500    | (same)         | 1.2         | `--font-display`             |
| Section heading (`h2` via SectionHead) | 20px    | 500    | `-0.5px`       | —           | `--font-display`             |
| Card title (`h2` via Card)             | 15px    | 500    | `-0.3px`       | —           | `--font-body`                |
| Modal title (`h2`)                     | 20px    | 500    | `-0.5px`       | 1.25        | `--font-display`             |
| Login title                            | 24px    | 500    | `-0.6px`       | —           | `--font-display`             |
| Nav link label                         | 14px    | 500    | `-0.28px`      | —           | `--font-body`                |
| Nav group label                        | 11px    | 500    | `0.06em`       | —           | `--font-body`                |
| Table header (`th`)                    | 11px    | 500    | `0.06em`       | —           | uppercase                    |
| Table body (`td`)                      | 13px    | —      | `-0.02em`      | —           | `--font-body`                |
| Form label                             | 13px    | 500    | `-0.02em`      | —           | `--font-body`                |
| Form input / select                    | 14px    | —      | `-0.28px`      | —           | `--font-body`                |
| Form hint                              | 12px    | —      | `-0.02em`      | 1.45        | `--font-body`                |
| Button                                 | 14px    | 500    | `-0.28px`      | —           | `--font-body`                |
| Icon button                            | 13px    | —      | —              | 1           | `--font-body`                |
| Pill / badge / tag                     | 11–12px | 500    | varies         | —           | `--font-body`                |
| Page note (subtitle)                   | 14px    | —      | `-0.02em`      | 1.5         | `--font-body`                |
| Card note                              | 13px    | —      | —              | 1.5         | `--font-body`                |
| Brand name (sidebar)                   | 14px    | 500    | `-0.28px`      | —           | `--font-body`                |
| Brand subtitle (sidebar)               | 12px    | —      | `-0.02em`      | —           | `--font-body`                |
| Breadcrumb                             | 13px    | —      | `-0.02em`      | —           | `--font-body` (strong = 500) |
| Row title                              | 14px    | 500    | `-0.28px`      | —           | `--font-body`                |
| Row meta                               | 12px    | —      | `-0.02em`      | —           | `--font-body`                |
| Tab label                              | 14px    | 500    | `-0.28px`      | —           | `--font-body`                |
| Section link                           | 13px    | 500    | `-0.02em`      | —           | `--font-body`                |
| Toast                                  | 13px    | 500    | —              | —           | `--font-body`                |

---

## Truncation Rules

Long single-line text always clips with an ellipsis, never wraps mid-word:

```css
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

Applied to: brand name, nav link labels, row titles, row meta, contact names in table, filter facet values.

`max-width` caps:

- Page note: `max-width: 64ch`
- Contact name / email cell: `max-width: 220px`

---

## Do / Don't

✅ **Do**

```tsx
<h1 className={styles.pageTitle}>Projects</h1>  {/* 26px, Roobert, -0.78px */}
<h2 className={styles.cardTitle}>Details</h2>    {/* 15px, Geist, -0.3px */}
```

❌ **Don't**

```tsx
<h1 style={{ fontSize: 28, fontFamily: 'Roobert' }}>Projects</h1>  {/* wrong size, wrong pattern */}
<p className="text-sm font-medium">Label</p>                         {/* no Tailwind */}
```
