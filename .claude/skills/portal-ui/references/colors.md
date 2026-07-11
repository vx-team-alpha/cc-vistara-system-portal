# Colors

## Rules
- All colors are CSS custom properties. Never hardcode a hex value in component code.
- The `.app` and `.login` root elements define every token; `data-theme="dark"` overrides them.
- Use semantic tokens (`--primary`, `--bad`, `--ok`) over raw palette values.
- Backgrounds never use a white box: the "ground" is `--page-bg` (`#F5F5F5` light / `#151515` dark).
- Status colors always pair a foreground token with its bg token (`--ok` + `--ok-bg`, etc.).

---

## Light Theme Tokens (`globals.css` + `.app` in `admin.module.css`)

### Page & Surface
| Token | Light value | Purpose |
|---|---|---|
| `--page-bg` | `rgb(245, 245, 245)` | The ground — `<body>` background, modal, panel background |
| `--card-bg` | `rgb(255, 255, 255)` | (Portfolio site card bg; rarely used in admin) |
| `--panel-bg` | `rgb(248, 248, 248)` | (Portfolio site panel) |
| `--surface` | `#fff` | Form inputs, nav active, topbar icon bg |
| `--surface-hover` | `#fafafa` | Hover state of `--surface` elements |
| `--side-bg` | `#efefef` | Sidebar background |
| `--fill` | `rgba(0,0,0,0.05)` | Nav hover bg, pill bg, tab bg |
| `--lift` | `rgba(255,255,255,0.55)` | Table row hover |
| `--lift-2` | `rgba(255,255,255,0.75)` | Selected row, active tab |
| `--glass` | `rgba(245,245,245,0.9)` | Topbar + sticky section nav (with backdrop-filter) |
| `--band` | cross-hatch SVG + `--band-bg` | Table heads, empty states, footer, save bar, modal head |
| `--band-bg` | `#efefef` | The plain background under the hatch |

### Text
| Token | Light value | Purpose |
|---|---|---|
| `--ink` | `rgb(0, 0, 0)` | Headings, strong text, active nav, page title |
| `--ink-soft` | `rgb(25, 25, 25)` | Default body text, table text |
| `--muted` | `rgb(102, 102, 102)` | (Portfolio site muted; use `--soft` in admin) |
| `--text-2` | `#4c4c4c` | Labels, card titles, nav links |
| `--soft` | `#6b6b6b` | Secondary text, page notes, hints |
| `--faint` | `#8f8f8f` | Tertiary text, breadcrumb separators |
| `--fainter` | `#a3a3a3` | Disabled-ish, timestamps, sort icons |

### Borders & Lines
| Token | Light value | Purpose |
|---|---|---|
| `--border` | `rgb(227, 227, 227)` | Input borders, btn borders |
| `--border-hover` | `#cfcfcf` | Hovered input/btn borders |
| `--border-strong` | `#cdcdcd` | Dashed filter facet border |
| `--line` | `rgba(0,0,0,0.07)` | Dividers, nav active border |
| `--rule-highlight` | `rgb(255, 255, 255)` | Top line of engraved hairline |
| `--rule-shadow` | `rgb(220, 220, 220)` | Bottom line of engraved hairline |

### Primary (action / CTA)
| Token | Light value | Dark value |
|---|---|---|
| `--primary` | `#191919` | `#3b1fe5` (indigo) |
| `--primary-hover` | `#000` | `#4b33f0` |
| `--on-primary` | `#fff` | `#fff` |

### Semantic Status
| Token | Light value | Use |
|---|---|---|
| `--ok` | `#15803d` | Success text / upcoming badge |
| `--ok-bg` | `rgba(21,128,61,0.09)` | Success badge bg |
| `--ok-solid` | `#15803d` | Save button after saved |
| `--bad` | `#b42318` | Error text, danger button |
| `--bad-bg` | `rgba(180,35,24,0.07)` | Error / notice bg |
| `--bad-line` | `rgba(180,35,24,0.25)` | Danger button border |
| `--bad-solid` | `#b42318` | Armed delete button bg |
| `--warn` | `#b45309` | Warning text |
| `--warn-bg` | `rgba(180,83,9,0.08)` | Warning badge bg ("Demo data" tag) |

### Overlays & Shadows
| Token | Light value | Use |
|---|---|---|
| `--ring` | `0 0 0 3px rgba(25,25,25,0.1)` | Focus ring on inputs, buttons |
| `--raise` | `0 1px 2px rgba(0,0,0,0.06)` | Active nav link shadow |
| `--pop-ring` | `rgba(0,0,0,0.06)` | Modal / menu panel border shadow |
| `--pop-shadow` | `rgba(0,0,0,0.14)` | Modal / menu panel drop shadow |
| `--scrim` | `rgba(24,24,24,0.28)` | Modal backdrop |

---

## Dark Theme Overrides

Dark mode is triggered by `data-theme="dark"` on `.app` or `.login`. Key changes:

| Token | Dark value |
|---|---|
| `--page-bg` | `#151515` |
| `--surface` | `#1e1e1e` |
| `--side-bg` | `#111111` |
| `--primary` | `#3b1fe5` (indigo — the only themed accent) |
| `--primary-hover` | `#4b33f0` |
| `--ring` | `0 0 0 3px rgba(99,80,255,0.35)` |
| `--ok` | `#7fd1a0` (lighter green for contrast) |
| `--bad` | `#f4a3a9` (lighter red) |
| `--rule-highlight` | `#262626` |
| `--rule-shadow` | `#0b0b0b` |
| `--scrim` | `rgba(0,0,0,0.6)` |

---

## Engraved Hairline

The portal's signature divider — a 2-layer inset shadow simulating a line etched into the `#F5F5F5` ground.

```css
--hair-t: inset 0 1px 0 var(--rule-highlight), inset 0 2px 0 var(--rule-shadow);
--hair-b: inset 0 -1px 0 var(--rule-shadow), inset 0 -2px 0 var(--rule-highlight);
--hair-l: inset 1px 0 0 var(--rule-highlight), inset 2px 0 0 var(--rule-shadow);
--hair-r: inset -1px 0 0 var(--rule-shadow), inset -2px 0 0 var(--rule-highlight);
```

Applied via `box-shadow: var(--hair-b)` etc.

---

## Do / Don't

✅ **Do**
```tsx
<div style={{ color: 'var(--bad)' }}>Error</div>
// or via CSS module class that uses var(--bad)
```

❌ **Don't**
```tsx
<div style={{ color: '#b42318' }}>Error</div>  // never hardcode
<div style={{ color: 'red' }}>Error</div>
<div className="bg-white text-black">...</div>  // no Tailwind
```
