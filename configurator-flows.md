# Configurator Flows — Technical Analysis

> **Purpose:** A detailed breakdown of how the current MVP configurator (`cc-/web/`) works — question lists, configuration data shapes, rendering pipeline, and the exact data contracts between each layer. Use this as the ground truth before designing the Supabase database schema.

---

## Table of Contents

1. [Two Configurators, One Pattern](#1-two-configurators-one-pattern)
2. [Door Configurator Flow](#2-door-configurator-flow)
3. [Window Configurator Flow](#3-window-configurator-flow)
4. [Shared Question / Option Data Shape](#4-shared-question--option-data-shape)
5. [How Questions Are Assembled](#5-how-questions-are-assembled)
6. [How Options Are Selected and Stored](#6-how-options-are-selected-and-stored)
7. [Conditional Visibility Rules](#7-conditional-visibility-rules)
8. [Rendering Pipeline](#8-rendering-pipeline)
9. [Data Files and Their Roles](#9-data-files-and-their-roles)
10. [Key Identifiers and Keys](#10-key-identifiers-and-keys)
11. [Gaps Relevant to DB Design](#11-gaps-relevant-to-db-design)

---

## 1. Two Configurators, One Pattern

Both the door configurator (`App.jsx`) and the window configurator (`Windows.jsx`) follow the **same 4-phase walkthrough model**:

```
Phase 0 — Choose product / range
Phase 1 — Choose layout / style (the geometry)
Phase 2 — Specify (walk through questions one-by-one)
Phase 3 — Review → Print PDF spec sheet
```

The central state in both is:
- A **product selection** (range for doors, folder/product for windows)
- A **geometry selection** (layout slug for doors, style slug for windows)
- A **picks map**: `{ questionKey → optionId }` — the single source of truth for all choices
- A **texts map**: `{ questionKey → string }` for free-text inputs (house number, etc.)

---

## 2. Door Configurator Flow

### Entry: `cc-/web/src/App.jsx`

#### State

| Variable | Type | Purpose |
|---|---|---|
| `rangeId` | `string` | One of `"original"` / `"gripcore"` / `"gripcore-stable"` |
| `layoutSlug` | `string` | Slug of the chosen door layout (84 total across ranges) |
| `designId` | `string` UUID | Which door design is active (e.g. "Belfry 3 Farmhouse") |
| `sideDesigns` | `Record<sectionId, design>` | Per-section side design overrides (for sideslabs) |
| `picked` | `Record<questionKey, optionId>` | All user choices keyed by `"questionName|sectionId"` |
| `texts` | `Record<questionKey, string>` | Free-text inputs (e.g. house number) |
| `style` | `string` | Style within range: `"Traditional"` / `"Contemporary"` / `"Designer"` / `"Stable"` |
| `internal` | `boolean` | Whether to show the internal face |

#### Data Loading

On mount, `App` fetches `/catalogue/manifest.json` (~4 MB) and passes it through `hydrate()`. The hydrated `data` object is the complete in-memory catalogue:

```
data = {
  layouts:     { rangeId: { layoutName: layout } }
  designs:     { rangeId: { styleName: [design, ...] } }
  sideDesigns: { rangeId: [sideDesign, ...] }
  finishes:    { optionId: { filters, texture, filter, sourceTexture } }
  hardware:    { rangeId: { optionId: { questions: [...] } } }
  variants:    [ variant ]    ← design variants for glass/cassette overrides
  probes:      [ probe ]      ← secondary questions (letterplate position, house number, glass pattern)
  assets:      { url: { src } }
  optionSets:  { hash: [option, ...] }
}
```

`hydrate()` resolves `optionSet` references: every question that has an `optionSet` key gets its `options` array replaced by looking up `data.optionSets[q.optionSet]`. This deduplicates shared option lists.

#### Phase 0 — Range

User picks from `RANGES` (hard-coded in `options.js`):

```js
RANGES = [
  { id: "original",        name: "ORiGINAL",      line: "Standard foam filled composite" },
  { id: "gripcore",        name: "GRiPCORE",       line: "Hybrid timber core composite" },
  { id: "gripcore-stable", name: "GRiPCORE Stable", line: "Stable door, hybrid timber core" },
]
```

Choosing a range resets all other state.

#### Phase 1 — Layout

`catalog.json` (84 entries, bundled at build time) is filtered to show only `Door Left Hand` layouts for the selected range. Each entry:

```json
{
  "rangeId": "original",
  "rangeName": "ORiGINAL",
  "designId": "e847f2dc-...",
  "name": "Door Left Hand",
  "slug": "standard-foam-filled-composite-doors-00-door-left-hand",
  "features": {
    "hand": "left",
    "toplight": false,
    "sidelightLeft": false,
    "sidelightRight": false,
    "sideslabLeft": false,
    "sideslabRight": false
  },
  "viewBox": "-20 -20 940 2090",
  "svg": "/svgs/standard-foam-filled-composite-doors-00-door-left-hand.svg",
  "squares": 2
}
```

The full layout (with questions, views, sections) is accessed as `data.layouts[rangeId][layoutName]`.

#### Phase 2 — Specify

`questionList(data, template, design, sideDesigns, picks)` builds the ordered list of questions. See [§5](#5-how-questions-are-assembled).

The question index (`qIndex`) is incremented by the user. At each step the user sees the question's options as image tiles and picks one, which updates `picked`.

#### Phase 3 — Review / PDF

A spec sheet is rendered using `pdf-lib` with the elevation PNG + a `particulars` table (question name → chosen description).

---

## 3. Window Configurator Flow

### Entry: `cc-/web/src/Windows.jsx`

#### State

| Variable | Type | Purpose |
|---|---|---|
| `folder` | `string` | `"chamfered-casement"` or `"sculptured-casement"` |
| `slug` | `string` | Chosen style slug (e.g. `"001-case-1"`) |
| `item` | `object` | Full item JSON fetched from `/window-data/{folder}/items/{slug}.json` |
| `catalogues` | `array` | Merged question catalogue: product-level + all style-level overrides |
| `images` | `Record<url, localPath>` | Mapping from portal image URLs to local cached paths |
| `picks` | `Record<questionKey, optionId>` | User choices |
| `texts` | `Record<questionKey, string>` | Free-text inputs |
| `drawing` | `string` | Raw SVG markup of the current window elevation |
| `materials` | `object` | Loaded from `render-materials.json` (textures, handles, glass patterns) |
| `internal` | `boolean` | Show internal or external profile colour |

#### Data Loading Sequence

```
1. Fetch /window-data/index.json             → product list (2 products)
2. User picks product → chooseProduct(folder)
   → fetch /window-data/{folder}/styles.json            (91 style thumbnails)
   → fetch /window-data/{folder}/questions.json         (shared question catalogue)
   → fetch /window-data/{folder}/questions-by-style.json (per-style overrides)
   → fetch /window-data/{folder}/option-images.json     (url → local path map)
3. User picks style → chooseStyle(style)
   → fetch /window-data/{folder}/items/{slug}.json      (full item: questions, images, dimensions)
4. Elevation SVG is fetched from item.images[face].path (external=type 1, internal=type 2)
```

#### Phase 0 — Product

Two choices, read from `index.json`:
- `chamfered-casement` → "Chamfered Casement" (14 question names, 91 styles)
- `sculptured-casement` → "Sculptured Casement" (same structure)

#### Phase 1 — Style

91 styles per product. Each style has:
- `slug`, `name`, `designId`
- `styleSvg` — path to the elevation SVG thumbnail
- `dimensions` — `[{ description, value }]` e.g. `Overall width: 1000`
- `questionNames` — which questions apply (fewer for unglazed)
- `glazedQuestionNames` — which questions apply when glazed

#### Phase 2 — Specify

`visibleQuestions(item, catalogues, picks, images)` builds the question list dynamically. See [§5](#5-how-questions-are-assembled).

#### Phase 3 — Review / PDF

Same PDF sheet pattern as doors.

---

## 4. Shared Question / Option Data Shape

### Question shape (door manifest)

```json
{
  "name": "Glass Design (Door)",
  "optionHeadingId": "uuid",
  "designComponentId": "uuid",
  "components": [{ "id": "uuid", "description": "Slab-01 (Frame-01)" }],
  "members": [],
  "hasText": false,
  "text": "",
  "validation": { "maxLength": 0, "maxLengthError": "", "regex": "", "regexError": "" },
  "visibilityTypeId": 0,
  "consumerListOrder": 5,
  "currentId": "uuid-of-default-option",
  "optionSet": "hash"   // resolved by hydrate() into .options array
}
```

After hydration, `q.options` is set from `data.optionSets[q.optionSet]`.

### Question shape (window item)

```json
{
  "name": "Profile Colour (External)",
  "optionHeadingId": "uuid",
  "consumerListOrder": 11,
  "listOrder": 1,
  "visibilityTypeId": 0,
  "hasText": false,
  "validation": { "maxLength": 0, "maxLengthError": "", "regex": "", "regexError": "" },
  "components": [{ "id": "uuid", "description": "Cill-01" }, ...],
  "options": [...]   // already inline, not via optionSet
}
```

### Option shape

```json
{
  "id": "3078bba6-23fb-47d5-bde1-298fb25d6bf0",
  "description": "White",
  "src": "/options/a96bec4391f8.jpg",       // local hashed path (doors)
  "imageUrl": "https://media.quotila.com/...",  // original portal URL (windows)
  "rgb": [185, 185, 180],                    // for colour-tint filter (some options)
  "textEntry": false,
  "filterId": "uuid",
  "isCurrentOption": true,                   // portal default
  "omitRules": false
}
```

For windows, `imageUrl` is resolved to a local path via the `images` map built from `option-images.json`.

---

## 5. How Questions Are Assembled

### Doors — `questionList()` in `configuration.js`

The function receives: `data`, `layout` (the template), `design` (chosen door design), `sideDesigns` (per-section overrides), `picks` (current answers).

**Steps:**

1. **Door questions** — from `design.questions` (or `layout` if no design). Any question *not* named `(Side)` is added. Key: `"questionName|door"`.

2. **Side questions** — from `layout.questions`. For each question named `(Side)`:
   - Duplicated for each side section in `layout.views['1'].sections` where `role === 'side'`.
   - `Door Design (Side)` is filtered to only designs matching the current style.
   - Glass questions are skipped for solid sidelight designs.
   - Key: `"questionName|sectionId"`.

3. **Layout questions** — layout questions that are not `(Side)` and not already in the list.

4. **Extra glass panes** — `glass-panes.js` maps SVG filenames to pane geometry. Any pane IDs not already covered by a `Glass Design (Side)` question get their own question added.

5. **Probes** — secondary questions from `data.probes` are conditionally added:
   - `Letterplate Position` — only if `Letterplate` option is picked
   - `House Number` — only if `Numerals` is picked
   - `Glass Pattern` — only if an `Obscure` glass design is picked

6. **Hardware-filtered options** — once `Hardware Colour` is picked, `data.hardware[rangeId][optionId]` provides updated option lists for handle, letterplate, knocker, spyhole, drip bar, escutcheon. The `list` entries are mutated in place.

7. **Inline Bar filter** — handle options named `inline bar` are always removed.

8. **Diagram attachments** — `Letterplate Position`, `Threshold`, and `Drip Bar` questions have their options augmented with diagram SVG paths.

9. **Final filter** — questions with no options and no `hasText` are removed; conditional ones (`Letterplate Position`, `House Number`, `Glass Pattern`, `Spyhole`) are removed when their trigger condition is not met.

10. **Sort** — by `consumerListOrder` ascending.

**Question key format:**
```
"<questionName>|<sectionId>"
// e.g. "Door Colour (External)|door"
// e.g. "Glass Design (Side)|ad1348d3-731d-4364-a3b9-b1e2bd4796b5"
```

---

### Windows — `visibleQuestions()` in `windows.js`

The function receives: `item`, `catalogues`, `picks`, `images`.

**Steps:**

1. **Base questions** — from `item.questions`. Filter: `visibilityTypeId !== 1` and has options. Each is `prepare()`d to resolve `imageUrl → localPath`.

2. **Glazing branch** — if `Glazing Method = "Glazed"` and `item.questionsWhenGlazed` exists, swap base to `questionsWhenGlazed` list.

3. **Catalogue enrichment** — iterate each `catalogue.questions` object (a map of `name → { contexts }`). For each question name:
   - Find the best-matching `context` (most specific `when` condition that matches current answers).
   - If the same question name appears exactly once in the base list, update its options/hasText in place.
   - If it doesn't appear, add it as an extra question.

4. **Sort** — by `listOrder` ascending (the portal's own stable sort order).

**Question key format:**
```
"<questionName>|<optionHeadingId>|<componentIds>|"
// e.g. "Profile Colour (External)|118dee4d-...|bedbb05c-...,79f1b724-...|"
```

---

## 6. How Options Are Selected and Stored

### Default option resolution (both configurators)

```js
// Doors (configuration.js)
option(q, picks) = q.options.find(o => o.id === picks[q.key])
                ?? q.options.find(o => o.id === q.currentId)
                ?? q.options.find(o => o.isCurrentOption)
                ?? q.options[0]

// Windows (windows.js)
chosenLabel(q, picks) = picks[q.key]
                      ?? q.options.find(o => o.isCurrentOption)
                      ?? q.options[0]
```

The `currentId` / `isCurrentOption` represents the portal's default selection.

### Doors — `pickOption(optionId)`

- `Door Range` → changes `style`, resets design and picks
- `Door Design (Door)` → sets `designId`, also stores in `picked`
- `Door Design (Side)` → looks up the side design in `data.sideDesigns[rangeId]`, stores in `sideDesigns[sectionId]`, also stores in `picked`
- All others → `picked[question.key] = optionId`

### Windows — `selectWindowOption(item, catalogues, picks, question, option)`

1. Sets `picks[question.key] = option.id`
2. If `Hardware Colour` changed: infers the right handle family (Monkey Tail vs Inline) and updates the handle pick too.
3. Runs `reconcileWindowPicks()` — multi-pass loop (up to 4 iterations) that drops any picks whose question is no longer visible or whose option is not in the current option list.

---

## 7. Conditional Visibility Rules

### Doors

Conditions are evaluated imperatively in `questionList()` rather than as declarative rules. The key dependencies:

| Secondary question | Trigger condition |
|---|---|
| `Letterplate Position` | `Letterplate` option picked AND description equals `"Letterplate"` |
| `House Number` | `Numeral` option picked AND description equals `"Numerals"` |
| `Glass Pattern` | `Glass Design (Door)` option picked AND description contains `"Obscure"` |
| `Spyhole` | Not shown if selected `Knocker` description contains `"spy"` or `"peep"` |
| Glass questions for side | Not shown if side design is `"Sidelight Solid"` |

### Windows

Conditions are declarative: each question context has a `when` object:
```json
{ "when": { "Glazing Method": "Glazed", "Glass Decoration": "Yes" } }
```
`bestContext()` finds the context whose `when` keys all match current answers, preferring the most specific (most keys). The matched context's options replace the question's options.

The overall question list switches entirely when `Glazing Method = "Glazed"` → uses `item.questionsWhenGlazed` instead of `item.questions`.

---

## 8. Rendering Pipeline

Both renderers follow: **load portal SVG → mutate materials in memory → return serialized string**.

### Doors — `renderDoor()` in `rendering.js`

Input: `{ data, layout, design, sideDesigns, questions, picks, texts, internal }`

1. **Face selection** — `internal ? '2' : '1'` selects which view from `layout.views`.

2. **Design variants** — if the chosen glass or cassette option has a matching `data.variants` entry (same range + designId + questionName + optionId), substitute that variant's SVG as the source design. This handles designs that have a different appearance when a specific glass is chosen.

3. **Leaf scene extraction** — `leafScene()` extracts `<g layertype="Diagram">` elements that belong to the door/cassette artwork (not the structural frame). The base SVG's diagram groups are removed and replaced with leaf scenes from the individual section designs.

4. **Per-section assembly** — for each section in the layout's view:
   - Load the section's design SVG
   - Prefix all IDs to avoid collisions (`namespace()`)
   - Apply door colour (`feColorMatrix + feBlend multiply` filter) to slab/cassette images
   - Special finishes (from `data.finishes`) are applied if available (recipe with ready-made SVG filter fragments)
   - Wrap in a `<svg x=... y=... viewBox=...>` that positions and scales the section into the layout's bounding box
   - Apply glass unit bitmaps to pane images (`paintGlass()`)
   - Apply hardware tones (chrome/black swap by URL fragment; gold/rose/white by `feColorMatrix` tint)
   - For side sections: apply sidelight cassette shape or hide glass if solid
   - For door section: place letterplate, drip bar, knocker, spyhole, house numeral as overlay `<image>` elements at known proportional coordinates

5. **Toplight/extra glass panes** — after assembly, `glassPanes()` scans the base SVG for `Glass_component_<uuid>` comments and applies the chosen glass unit to those pane rects.

6. **Threshold/Cill member swap** — for `Threshold` and `Cill` questions, finds the profile member element in the layout SVG and replaces it with the geometry from the matching variant SVG, adjusting coordinates for size differences.

7. **Profile colour** — applies an RGB fill to all white `<rect>` elements inside `Profile_member` groups.

8. **Return** — `new XMLSerializer().serializeToString(base.documentElement)`

---

### Windows — `renderWindow()` in `window-renderer.js`

Input: `markup` (SVG string), `questions`, `picks`, `internal`, `materials`

`materials` has:
- `materials.colours[colourName]` → texture image URL
- `materials.handles[handleName]` → `{ url, dx, dy, width, height }`
- `materials.patterns[patternName]` → glass pattern image URL
- `materials.decorations[decorationName]` → SVG fragment string
- `materials.assets[url]` → local cached URL

Steps:

1. **Profile colour** — find `<image>` elements whose `href` contains `foil` or `sharedprofile_colour`; replace `href` with the texture from `materials.colours`.

2. **Handle (internal only)** — find `<image>` with `casement_handles` in href; replace and apply dx/dy/width/height offset corrections from the handle capture data.

3. **Security / sanitise** — strip `<script>`, `<foreignObject>`, `<style>`, all `on*` attributes, `resize` attributes.

4. **Cill** — if `Cill = "No"`, hide all elements whose `componentid` is in the cill component set.

5. **Glass** — for each `<rect fill="gradient-glass">`:
   - If `Glazing Method = "Glazed"` and a pattern is chosen: insert a `<image>` with `opacity: 0.75` over the rect.
   - If a glass decoration is chosen: insert a `<svg>` overlay (scaled to the pane) containing the decoration SVG fragment, with the profile texture applied to decoration images.

6. **Return** — serialized SVG string.

---

## 9. Data Files and Their Roles

### Door data

| File | Size | Purpose |
|---|---|---|
| `web/public/catalogue/manifest.json` | ~4 MB | Complete door catalogue. Contains layouts, designs, sideDesigns, finishes, hardware, variants, probes, assets, optionSets. Fetched at runtime. |
| `web/src/catalog.json` | ~50 KB | Slim layout index (84 entries). Bundled at build time. Used for the layout picker grid. |
| `web/src/designer.json` | small | 14 questions, 709 options for the ORiGINAL range. Bundled at build time. (Legacy, partially superseded by manifest.) |
| `web/src/options.js` | tiny | `RANGES` and `PHASES` constants. Hard-coded. |
| `web/src/glass-panes.js` | small | Map of SVG filename → pane geometry `[{ id, x, y, w, h }]`. Used to add glass questions for panes not covered by standard questions. |
| `web/src/glass-units.js` | medium | Map of glass option ID → `[{ src, w, h }]`. Scraped glass unit bitmaps. |
| `web/public/renders/` | many files | Door elevation SVGs per layout per face |
| `web/public/options/` | many files | Option tile PNGs (content-hashed filenames) |

### Window data

| File | Purpose |
|---|---|
| `web/dist/window-data/index.json` | 2 products with metadata (folder, productId, retailName, question name lists) |
| `web/dist/window-data/{folder}/styles.json` | 91 style entries (slug, name, designId, styleSvg, dimensions, questionNames) |
| `web/dist/window-data/{folder}/items/{slug}.json` | Full item: dimensions, questions, questionsWhenGlazed, components, images |
| `web/dist/window-data/{folder}/questions.json` | Shared catalogue: `{ questions: { name: { contexts: [...] } } }` |
| `web/dist/window-data/{folder}/questions-by-style.json` | Per-style question overrides: `[{ designId, walk: { questions: {...} } }]` |
| `web/dist/window-data/{folder}/option-images.json` | `[{ url, path }]` mapping portal URLs to cached local paths |
| `web/dist/window-data/render-materials.json` | Colour textures, handle capture data, glass patterns/decorations |
| `web/dist/window-data/{folder}/elevations/` | Window elevation SVGs per style per face |

---

## 10. Key Identifiers and Keys

### Doors

| Identifier | Source | Format | Used for |
|---|---|---|---|
| `rangeId` | hard-coded | `"original"` / `"gripcore"` / `"gripcore-stable"` | Top-level namespace for all data |
| `layoutSlug` | `catalog.json` | e.g. `"standard-foam-filled-composite-doors-00-door-left-hand"` | Layout picker, navigation |
| `layoutName` | manifest | e.g. `"Door Left Hand"` | Key into `data.layouts[rangeId]` |
| `designId` | manifest | UUID | Identifies door design; key into designs, variants |
| `questionKey` | derived | `"<name>|<sectionId>"` | Key in `picks` map; `sectionId` is UUID or `"door"` / `"layout"` |
| `optionId` | manifest | UUID | Value stored in `picks[key]` |
| `optionHeadingId` | manifest | UUID | Links question to optionSet group |
| Asset hash | content hash | 20-char hex | Filename of option tile images |

### Windows

| Identifier | Source | Format | Used for |
|---|---|---|---|
| `folder` | `index.json` | `"sculptured-casement"` / `"chamfered-casement"` | Product-level namespace |
| `productId` | `index.json` | integer | Portal product ID |
| `designId` | `styles.json` | UUID | Style identifier |
| `slug` | `styles.json` | e.g. `"001-case-1"` | URL-safe style key; item filename |
| `questionKey` | derived | `"<name>|<optionHeadingId>|<componentIds>|"` | Key in `picks` map |
| `optionId` | item | UUID | Value stored in `picks[key]` |
| `optionHeadingId` | item | UUID | Groups question options |
| `componentId` | item | UUID | Links question to SVG `componentid` attribute |

---

## 11. Gaps Relevant to DB Design

These are the places where the current MVP's data model is incomplete or implicit, and where the DB schema needs to be more explicit:

### 1. Range / Product Type is implicit
The current code uses hard-coded string constants (`RANGES` in `options.js`, `index.json` for windows). A DB needs a `configurator_types` table and a `product_ranges` table that can be extended without code changes.

### 2. Questions are not standalone records
Questions are embedded inside layout/design JSON blobs. In the DB, questions should be first-class rows with:
- `configurator_type_id` (door / window)
- `range_id` (which range(s) they belong to)
- `section_scope` (`"door"` / `"side"` / `"layout"`)
- `condition` (JSONB visibility rule)
- `sort_order` (maps to `consumerListOrder` / `listOrder`)

### 3. Option images are content-addressed but not catalogued
Images are stored as hashed filenames. The DB's `assets` table (proposed in `knowledge_base.md`) needs to track `external_url` (portal source) and `local_hash` so the scrape pipeline can detect stale assets.

### 4. Conditional questions have two patterns
- Doors: conditional questions are added by name from `data.probes` based on current picks (imperative logic in JS)
- Windows: conditional questions are resolved via context matching (`when` objects)

The DB's `condition` JSONB column needs to support both patterns: a simple `"when_question_answer"` trigger AND a `"when": { "questionName": "value" }` multi-key map.

### 5. Hardware-filtered options
For doors, the available handle/letterplate/spyhole options depend on the chosen `Hardware Colour`. This is a second-level conditional: the *option list* changes, not just the question's visibility. The DB needs to model this as an `option_filter` or `option_context` relationship.

### 6. Variants (design+glass combos)
Some door designs have a completely different SVG when a specific glass option is chosen (`data.variants`). This is a `design_variant` entity: `(designId, questionName, optionId) → variantDesign`. Needed in DB for rendering accuracy.

### 7. Side designs are a separate catalogue
`data.sideDesigns[rangeId]` is a list of side panel designs distinct from door designs. In the DB this should be a separate table or a `role = "side"` flag on the layout entity.

### 8. Style (Traditional / Contemporary / Designer / Stable) is a sub-grouping
Door designs are grouped by style within a range. The DB needs a `style_group` or `design_category` entity to preserve this grouping.

### 9. "No configurator" without code exists for new products
Currently adding a new configurator type (e.g. bifold doors) requires new React components, new data files, new rendering code. The DB design should define a `configurator_type` record that connects to reusable question/option structures so future types share the schema.

### 10. Dimensions are per-style for windows, absent for doors
Window styles have `dimensions` (width, height, floor distance). Door layouts have sizing info buried in manifest metadata. The DB needs a `dimensions` JSONB field on `layouts` / `styles`.

---

*Generated: 9 November 2026 — based on full read of `cc-/web/src/App.jsx`, `Windows.jsx`, `configuration.js`, `windows.js`, `rendering.js`, `window-renderer.js`, `options.js`, `glass-panes.js`, `catalog.json`, `designer.json`, `web/public/catalogue/manifest.json`, `web/dist/window-data/index.json`, `sculptured-casement/styles.json`, `sculptured-casement/questions.json`, `sculptured-casement/items/001-case-1.json`.*
