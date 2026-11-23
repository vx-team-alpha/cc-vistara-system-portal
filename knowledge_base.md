# Frontage — Product Knowledge Base

> **Purpose of this document:** A complete snapshot of what is built, how it works, and a blueprint for the next phase: a SaaS platform where customers embed doors and windows design configurators in their own websites. Read this before every work session.

---

## Table of Contents

1. [What Is Frontage?](#1-what-is-frontage)
2. [Current Architecture](#2-current-architecture)
3. [Data Pipeline — How Catalogue Data Is Collected](#3-data-pipeline--how-catalogue-data-is-collected)
4. [Door Configurator — How It Works](#4-door-configurator--how-it-works)
5. [Window Configurator — How It Works](#5-window-configurator--how-it-works)
6. [Rendering Engine](#6-rendering-engine)
7. [SaaS Vision — Embeddable Configurator Platform](#7-saas-vision--embeddable-configurator-platform)
8. [Database Design for Embeddable Components](#8-database-design-for-embeddable-components)
9. [Cloud Hosting Strategy for Doors & Windows Designs](#9-cloud-hosting-strategy-for-doors--windows-designs)
10. [Admin Portal Expansion Plan](#10-admin-portal-expansion-plan)
11. [Open Work & Known Gaps](#11-open-work--known-gaps)
12. [Constraints to Never Break](#12-constraints-to-never-break)

---

## 1. What Is Frontage?

**Frontage** is a homeowner-facing configurator that lets a user pick a composite door or casement window, walk through design options (colour, glass, hardware), and produce a shareable specification — all without prices, accounts, or checkout.

### Core Users (today)

| User                  | Goal                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Homeowner             | Choose a door/window layout, configure design, colour, glass, and hardware, then get a spec to take to a dealer. |
| Dealer (future admin) | Publish their own catalogue, embed the configurator on their site, receive leads.                                |

### Product Principles

- **The elevation is the source of truth.** The live SVG drawing changes with every option pick.
- One decision at a time; previous choices stay visible and editable.
- Do not invent stock, prices, or brand affiliation.
- Sample finishes are honest about being samples.
- The walkthrough must be completable on a tablet.

---

## 2. Current Architecture

```
cc-/
├── web/                        # Vite + React frontend (the configurator UI)
│   ├── src/
│   │   ├── App.jsx             # Door configurator — phases, state, option picking
│   │   ├── Windows.jsx         # Window configurator — same phase model for windows
│   │   ├── Elevation.jsx       # SVG elevation viewer + colour stain (doors)
│   │   ├── rendering.js        # SVG mutation engine — doors (applies colour, glass, hardware)
│   │   ├── window-renderer.js  # SVG mutation engine — windows (profile, glass pattern)
│   │   ├── configuration.js    # Data hydration, question-list builder, design selector
│   │   ├── windows.js          # Window-specific helpers (assetUrl, visibleQuestions, etc.)
│   │   ├── glass-panes.js      # Glass pane geometry per layout
│   │   ├── glass-units.js      # Glass unit bitmap registry
│   │   ├── options.js          # RANGES, PHASES constants (doors)
│   │   ├── designer.json       # 14 door questions, 709 options (ORiGINAL range)
│   │   ├── catalog.json        # 84 door layouts (slim — IDs, ranges, slugs)
│   │   └── print-sheet.js      # PDF spec sheet builder
│   └── public/
│       ├── catalogue/manifest.json   # ~4 MB door manifest (hydrated on load)
│       ├── window-data/              # Window catalogue data
│       │   ├── index.json            # Product list (Chamfered & Sculptured Casement)
│       │   ├── sculptured-casement/  # 91 styles, questions, elevations, option images
│       │   └── chamfered-casement/   # 91 styles, questions, elevations, option images
│       ├── options/                  # Option tile images (hashed filenames)
│       ├── renders/                  # Door elevation SVGs (external.svg, internal.svg)
│       └── glass/                    # Scraped glass unit bitmaps
│
├── data/                       # Raw scraped data (not served directly)
│   ├── catalog.json            # Full 84-layout door catalogue with SVG metadata
│   ├── svgs/                   # Door elevation SVGs
│   ├── previews/               # PNG previews
│   ├── glass-units/            # Scraped glass unit images per option
│   ├── targeted-captures/      # 32 portal configuration states (SVGs + renders)
│   └── windows/                # Window scrape artefacts
│
├── doorco_audit/               # Scrape helpers for the Doorco/Quotila portal
│   ├── catalogue.json          # Investigated API structure
│   ├── recorder.js             # Playwright capture script
│   └── scrape_*.js             # Option image scraping helpers
│
├── scrape_windows.py           # Window catalogue scraper (Advance 70, Selecta portal)
├── scrape_designer.py          # Door designer option scraper (Doorco/Quotila portal)
├── scrape_glass.py             # Glass unit bitmap scraper
├── pack_catalogue.py           # Builds manifest.json from raw scrape data
├── pack_designer.py            # Copies option images → web/public/options/
├── PRODUCT.md                  # Authoritative product rules
└── STATUS.md                   # Build log and next-session handoff
```

### Tech Stack

| Layer              | Technology                                                              |
| ------------------ | ----------------------------------------------------------------------- |
| Frontend framework | Vite + React 19                                                         |
| Rendering          | SVG DOM mutation (no canvas for windows; canvas colour stain for doors) |
| PDF output         | `pdf-lib`                                                               |
| Fonts              | `@fontsource/inter`                                                     |
| Scraping           | Python 3 (`requests`, `playwright`) + Node.js (Playwright)              |
| Deployment         | Vercel (`web/vercel.json`)                                              |

---

## 3. Data Pipeline — How Catalogue Data Is Collected

The catalogue data is **scraped from the Quotila portal** (a third-party configurator used by Nationwide Composite Doors / Doorco and Selecta / Advance 70). It is **not** invented.

### Door Pipeline

```
Quotila portal (doorco.server.quotila.com)
        │
        ├── scraper.py          → data/svgs/, data/previews/, data/catalog.json
        │                          84 layouts across 3 ranges (ORiGINAL, GRiPCORE, Stable)
        │
        ├── scrape_designer.py  → raw option images, 14 questions, 709 options
        │
        ├── pack_designer.py    → web/public/options/ (hashed), web/src/designer.json
        │
        ├── scrape_glass.py     → data/glass-units/ (per-glass-option bitmaps)
        │
        └── pack_catalogue.py   → web/public/catalogue/manifest.json (~4 MB)
```

### Window Pipeline

```
Selecta portal (selecta.portal.quotila.com)
        │
        └── scrape_windows.py   → web/dist/window-data/
                                   ├── index.json (product list)
                                   ├── sculptured-casement/ (91 styles, questions, SVGs)
                                   └── chamfered-casement/  (91 styles, questions, SVGs)
```

### Key Data Files

| File                                             | Contents                                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `web/public/catalogue/manifest.json`             | Full door manifest: layouts, questions, option sets, designs, side designs, hardware, variants |
| `web/src/catalog.json`                           | Slim layout list (84 entries) used for the layout picker                                       |
| `web/src/designer.json`                          | 14 questions, 709 options for the ORiGINAL designer                                            |
| `web/dist/window-data/index.json`                | 2 window products (Chamfered + Sculptured Casement), 91 styles each                            |
| `web/dist/window-data/*/styles.json`             | Style SVG paths, thumbnails, metadata                                                          |
| `web/dist/window-data/*/questions.json`          | Shared questions across styles                                                                 |
| `web/dist/window-data/*/questions-by-style.json` | Per-style question overrides                                                                   |

---

## 4. Door Configurator — How It Works

### Phases

```
Range → Layout → Specify (up to ~19 questions) → Review → PDF
```

### State (App.jsx)

| State variable | Purpose                                                           |
| -------------- | ----------------------------------------------------------------- |
| `rangeId`      | Active product range (ORiGINAL / GRiPCORE / Stable)               |
| `layoutSlug`   | Chosen door layout (e.g. "left-hand-door-right-hand-sideslab")    |
| `designId`     | Currently selected door design (e.g. Belfry 3 Farmhouse)          |
| `sideDesigns`  | Per-section side design overrides (keyed by section ID)           |
| `picked`       | Map of `question.key → optionId` for all user choices             |
| `texts`        | Free-text inputs (numerals)                                       |
| `internal`     | Whether the elevation is showing the internal face                |
| `style`        | Door range style (Traditional / Contemporary / Designer / Stable) |

### Question List Builder (`configuration.js → questionList`)

1. Start with the **design's questions** (door-specific: colour, glass, etc.).
2. Append the **layout's side questions** (`(Side)` suffix), duplicated for left/right if the layout has two side sections.
3. Skip glass questions on solid sidelight designs.
4. Each question gets a `key = "name|section"` to allow the same question name on different sections.

### Elevation Rendering (`rendering.js`)

The door SVG is a layered portal capture. The renderer mutates the DOM in memory:

1. **Colour:** Finds slab and cassette `<image>` layers, applies a `feColorMatrix` filter + `feBlend multiply` using the chosen finish RGB.
2. **Glass design:** Swaps `xlink:href` on glass pane images to the scraped unit bitmaps.
3. **Hardware colour:** Tones handle/letterplate/spyhole images (black vs chrome; colour filters for gold/rose/white).
4. **Sidelight shape:** Swaps cassette layer source for named sidelight designs (Carnoustie, Muirfield, etc.).
5. **Internal face:** Triggered by `(Internal)` questions; flips the elevation.
6. **Letterplate position:** Repositions the letterplate `<image>` to y-coordinates captured from the portal.
7. **Accessories:** Spyhole, knocker, numeral overlaid as SVG `<image>` elements at known coordinates.

The mutated SVG string is returned and set as `innerHTML` of a container div.

---

## 5. Window Configurator — How It Works

### Phases

```
Product → Style → Specify → Review → PDF
```

### State (Windows.jsx)

| State variable | Purpose                                                                              |
| -------------- | ------------------------------------------------------------------------------------ |
| `folder`       | Active product folder (`sculptured-casement` / `chamfered-casement`)                 |
| `slug`         | Chosen style slug (e.g. "case-32")                                                   |
| `item`         | Full item JSON from `window-data/{folder}/items/{slug}.json`                         |
| `catalogues`   | Merged question catalogues (product-level + style-level)                             |
| `picks`        | Map of `question.key → optionId`                                                     |
| `internal`     | Whether to show internal profile colour                                              |
| `materials`    | Loaded from `render-materials.json` (colour textures, handle images, glass patterns) |
| `drawing`      | Raw SVG markup of the current window elevation                                       |

### Data Loading Sequence

```
1. fetch /window-data/index.json          → product list
2. user picks product → fetch /window-data/{folder}/styles.json   → 91 style thumbnails
3. user picks style   → fetch /window-data/{folder}/items/{slug}.json → full item (questions, images)
4.                    → fetch /window-data/{folder}/questions.json (shared)
5.                    → fetch /window-data/{folder}/questions-by-style.json
6. fetch /window-data/render-materials.json → colour textures, handles, glass
7. fetch the elevation SVG path from item.images
```

### Visible Questions (`windows.js → visibleQuestions`)

Questions have a `when` condition object (e.g. `{ "Glazing Method": "Glazed" }`). `visibleQuestions` evaluates `when` against current answers and filters accordingly. Each question's options are enriched with a local `src` from the image map (URL → cached local path).

### Window Rendering (`window-renderer.js → renderWindow`)

1. Parse the elevation SVG.
2. **Profile colour:** Find `<image>` elements with `href` matching `foil` or `sharedprofile_colour`; replace with the chosen colour texture URL from `materials.colours`.
3. **Handle (internal view):** Swap `casement_handles` images; apply offset/size corrections from the handle capture data.
4. **Cill visibility:** If Cill = "No", hide elements whose `componentid` matches a cill component.
5. **Glass pattern:** Insert a `<image>` over `gradient-glass` rects with the chosen pattern bitmap.
6. **Glass decoration:** Insert an `<svg>` overlay with the decoration SVG fragment scaled to the pane.
7. Sanitise: strip `<script>`, `<foreignObject>`, `<style>`, all `on*` attributes.

---

## 6. Rendering Engine

Both configurators share the same philosophy:

> **Portal captures are the ground truth. The renderer replaces materials inside the captured geometry — it does not redraw geometry.**

| Concern             | Doors                                                         | Windows                                                    |
| ------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| Geometry source     | Scraped SVG from Quotila Job API                              | Scraped SVG from Selecta portal                            |
| Colour application  | `feColorMatrix` + `feBlend multiply` on slab/cassette layers  | Swap `foil`/`sharedprofile` image hrefs to texture bitmaps |
| Glass               | Swap `xlink:href` per pane to glass-unit bitmap               | Insert `<image>` over `gradient-glass` rects               |
| Hardware            | Swap handle/letterplate image hrefs; apply tone filter        | Swap `casement_handles` href; apply size/offset correction |
| Namespace collision | `namespace()` prefixes all SVG IDs when multiple SVGs coexist | Single SVG, no collision issue                             |

---

## 7. SaaS Vision — Embeddable Configurator Platform

### What We Are Building

A **white-label SaaS** where any door or window dealer/retailer can:

1. Sign up and get a **tenant account** in the admin portal.
2. Upload or select product catalogues (doors, windows, or both).
3. Get an **embed snippet** (a `<script>` tag or `<iframe>`) to drop into their existing website.
4. Homeowners on the dealer's site use the configurator and submit enquiries that go back to the dealer.
5. The dealer manages leads and product data from their admin dashboard.

### Embed Modes

| Mode                  | How it works                                                                                         | Best for                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Script embed**      | `<script src="https://cdn.frontage.io/embed.js" data-key="pub_xxx"></script>` injects a React island | Sites with any CMS (WordPress, Squarespace, Wix) |
| **iFrame embed**      | `<iframe src="https://app.frontage.io/embed/pub_xxx" ...>`                                           | Maximum isolation, simplest integration          |
| **Next.js Component** | npm package `@frontage/react` → `<FrontageConfigurator publishableKey="..." />`                      | Dealer sites built on Next.js / React            |

### Tenant Isolation

Each tenant's embed:

- Loads only their product catalogue (filtered by `tenantId`).
- Submits leads to their own CRM webhook or email.
- Can apply their own brand colours via CSS custom properties or embed config.
- Has usage metered to their plan tier.

---

## 8. Database Design for Embeddable Components

### Conceptual Entity Model

```
Tenant (the dealer / retailer)
  ├── EmbedWidget          (one or many per tenant)
  │     ├── WidgetConfig   (branding, allowed products, CTA text)
  │     └── PublishableKey (rotatable API key for the embed)
  │
  ├── ProductCatalogue     (a set of designs offered by this tenant)
  │     ├── CatalogueProduct  (links to a canonical Product)
  │     └── ProductVariant    (tenant-specific overrides: price band, label)
  │
  ├── Lead                 (enquiry submitted through the widget)
  │     └── LeadSpec       (the chosen options at time of enquiry)
  │
  └── Subscription         (plan, billing cycle, limits)

Product (canonical, platform-managed)
  ├── ProductType          (door | window)
  ├── ProductRange         (ORiGINAL | GRiPCORE | Stable | Advance70Chamfered | ...)
  ├── Layout               (a specific door/window geometry — left-hand, sideslab, etc.)
  ├── Question             (configure step — Door Design, Colour, Glass, Hardware)
  │     └── Option         (selectable answer — Belfry 3 Farmhouse, Azure, etc.)
  └── Asset                (image/SVG stored in object storage, addressable by hash)
```

### Proposed PostgreSQL Schema

```sql
-- ─── Platform / multi-tenancy ───────────────────────────────────────────────

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,            -- used in embed URLs
  name          TEXT NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'starter', -- starter | pro | enterprise
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE embed_widgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                 -- e.g. "Homepage Configurator"
  publishable_key TEXT UNIQUE NOT NULL,          -- pub_live_xxx  (public, embed-safe)
  secret_key      TEXT UNIQUE NOT NULL,          -- sk_live_xxx   (server-side only)
  config          JSONB NOT NULL DEFAULT '{}',   -- branding, CTA, allowed_product_types
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Canonical product catalogue ────────────────────────────────────────────

CREATE TABLE product_types (
  id    SMALLINT PRIMARY KEY,
  slug  TEXT UNIQUE NOT NULL,  -- 'door' | 'window'
  label TEXT NOT NULL
);

CREATE TABLE product_ranges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type  SMALLINT NOT NULL REFERENCES product_types(id),
  slug          TEXT UNIQUE NOT NULL,  -- 'original' | 'gripcore' | 'advance70-sculptured'
  name          TEXT NOT NULL,
  source_url    TEXT,                  -- scrape source for audit trail
  active        BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE layouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  range_id      UUID NOT NULL REFERENCES product_ranges(id),
  slug          TEXT NOT NULL,
  name          TEXT NOT NULL,         -- "Door Left Hand", "Left Hand + Right Sideslab"
  svg_asset_id  UUID,                  -- FK to assets table
  preview_asset_id UUID,
  view_box      TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  UNIQUE(range_id, slug)
);

CREATE TABLE questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  range_id         UUID REFERENCES product_ranges(id),   -- NULL = cross-range
  layout_id        UUID REFERENCES layouts(id),          -- NULL = range-level
  name             TEXT NOT NULL,
  section          TEXT NOT NULL DEFAULT 'door',         -- 'door' | 'side' | 'layout'
  sort_order       SMALLINT NOT NULL DEFAULT 0,
  condition        JSONB,                                -- visibility rules {"when": {}}
  metadata         JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE options (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id      UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  external_id      TEXT,                                 -- portal option ID (for scrape sync)
  description      TEXT NOT NULL,
  image_asset_id   UUID,
  sort_order       SMALLINT NOT NULL DEFAULT 0,
  is_default       BOOLEAN NOT NULL DEFAULT false,
  metadata         JSONB NOT NULL DEFAULT '{}'           -- rgb, tone, design_name, etc.
);

CREATE TABLE assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash         TEXT UNIQUE NOT NULL,     -- SHA-256 of file content
  storage_key  TEXT NOT NULL,            -- e.g. "assets/f7e4d3e8dc4c.jpg"
  mime_type    TEXT NOT NULL,
  byte_size    INT NOT NULL,
  cdn_url      TEXT,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Tenant product catalogue ────────────────────────────────────────────────

CREATE TABLE tenant_catalogues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  range_id    UUID NOT NULL REFERENCES product_ranges(id),
  active      BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(tenant_id, range_id)
);

CREATE TABLE tenant_layout_overrides (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  layout_id    UUID NOT NULL REFERENCES layouts(id),
  hidden       BOOLEAN NOT NULL DEFAULT false,
  label        TEXT,                                    -- tenant rename
  sort_order   SMALLINT
);

-- ─── Leads ───────────────────────────────────────────────────────────────────

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  widget_id       UUID NOT NULL REFERENCES embed_widgets(id),
  layout_id       UUID REFERENCES layouts(id),
  name            TEXT,
  email           TEXT,
  phone           TEXT,
  spec            JSONB NOT NULL DEFAULT '{}',   -- snapshot of picks at submission time
  elevation_png   TEXT,                           -- storage_key of captured PNG
  source_url      TEXT,                           -- the page where widget was embedded
  status          TEXT NOT NULL DEFAULT 'new',    -- new | viewed | contacted | closed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Usage metering ──────────────────────────────────────────────────────────

CREATE TABLE widget_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id   UUID NOT NULL REFERENCES embed_widgets(id),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed   BOOLEAN NOT NULL DEFAULT false,     -- reached Review phase
  lead_id     UUID REFERENCES leads(id)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_leads_tenant        ON leads(tenant_id, created_at DESC);
CREATE INDEX idx_leads_widget        ON leads(widget_id);
CREATE INDEX idx_sessions_widget     ON widget_sessions(widget_id);
CREATE INDEX idx_options_question    ON options(question_id, sort_order);
CREATE INDEX idx_layouts_range       ON layouts(range_id);
```

### Key Design Decisions

| Decision                          | Rationale                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `assets` table with content hash  | Deduplicates scraped images; same bitmap shared across tenants                   |
| `config JSONB` on `embed_widgets` | Flexible branding/feature flags without schema migrations                        |
| `spec JSONB` on `leads`           | Snapshot of exact picks at enquiry time; layout/option IDs may change later      |
| `condition JSONB` on `questions`  | Mirrors the portal's `when` visibility rules; avoids a separate conditions table |
| `publishable_key` / `secret_key`  | Public key is safe in embed HTML; secret key for server-side webhook auth        |

---

## 9. Cloud Hosting Strategy for Doors & Windows Designs

### Asset Storage

All SVGs, PNGs, and bitmaps (door/window elevations, option tiles, glass units, colour textures) are stored in **object storage with a CDN** in front. The assets are immutable — keyed by content hash — so CDN cache TTLs can be set to 1 year.

**Recommended stack:**

| Service                          | Purpose                                                                   |
| -------------------------------- | ------------------------------------------------------------------------- |
| **Cloudflare R2**                | Primary object storage (no egress fees). Bucket: `frontage-assets`.       |
| **Cloudflare CDN / Cache Rules** | Serve `cdn.frontage.io/assets/*` with 1-year TTL, immutable headers.      |
| **Cloudflare Images** (optional) | On-the-fly resizing for option thumbnails (avoid storing multiple sizes). |

### Folder Structure in R2

```
frontage-assets/
├── assets/              # Content-addressed files (hash as filename)
│   ├── f7e4d3e8dc4c.jpg   # Door slab texture
│   ├── ac0f26970bd8.jpg   # Glass unit bitmap
│   └── ...
├── elevations/          # Canonical door/window SVG elevations
│   ├── doors/
│   │   ├── original/
│   │   │   └── {layout-slug}/
│   │   │       ├── external.svg
│   │   │       └── internal.svg
│   │   └── gripcore/
│   └── windows/
│       ├── advance70-sculptured/
│       │   └── {style-slug}.svg
│       └── advance70-chamfered/
├── option-images/       # Option tile PNGs per product range
│   └── {range-slug}/{hash}.png
└── glass-units/         # Scraped glass unit bitmaps
    └── {option-id}/
        ├── door-lite.jpg
        └── side-lite.jpg
```

### Application Hosting

```
┌─────────────────────────────────────────────────────┐
│                   Cloudflare (edge)                 │
│  cdn.frontage.io → R2 (assets, SVGs, bitmaps)       │
│  app.frontage.io → Workers / Vercel edge            │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│          Next.js App (admin portal + API)           │
│  Deployed on Vercel (or Cloudflare Workers via      │
│  next-on-pages)                                     │
│                                                     │
│  /app/*          — admin dashboard (tenant UI)      │
│  /api/*          — REST API (leads, catalogues)     │
│  /embed/{key}    — iframe embed entry point         │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│              Supabase (PostgreSQL + Auth + Storage) │
│  - tenants, embed_widgets, leads tables             │
│  - Supabase Auth for admin portal login             │
│  - Supabase Storage as a secondary asset store      │
│    (or use R2 directly via signed URLs)             │
└─────────────────────────────────────────────────────┘
```

### Embed CDN Bundle

The embed script (`embed.js`) is a small React island that:

1. Reads `data-key` from its `<script>` tag.
2. Fetches the tenant's catalogue config from `/api/embed/{publishable_key}/config`.
3. Renders the configurator in a shadow DOM island (style isolation).
4. POSTs leads to `/api/embed/{publishable_key}/leads`.

**Hosting the embed bundle:**

- Build with Vite `library` mode → single IIFE bundle.
- Upload versioned: `cdn.frontage.io/embed/v1/embed.js`.
- Customers pin `v1` for stability; we push breaking changes as `v2`.

### Scaling Considerations

| Concern                             | Solution                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| SVG rendering is client-side        | No server rendering cost per configuration.                                       |
| Catalogue JSON can be large (~4 MB) | Split manifest by range; lazy-load only the selected range.                       |
| CDN cache for assets                | 1-year immutable headers on content-hashed filenames.                             |
| Multi-tenant API rate limiting      | Cloudflare rate limit rules per `publishable_key` header.                         |
| Lead webhooks                       | Background queue (e.g. Cloudflare Queue or Trigger.dev) to avoid blocking the UI. |

---

## 10. Admin Portal Expansion Plan

The admin portal (Next.js) needs the following sections added:

### Portal Structure

```
/app
├── /dashboard          — Overview: leads this week, widget impressions, quota usage
├── /catalogues         — Manage which product ranges are active for this tenant
│   └── /catalogues/[rangeSlug]
│       ├── Layouts tab — show/hide/reorder layouts
│       └── Options tab — show/hide specific colours, glass designs (future)
├── /widgets            — Manage embed widgets
│   ├── New widget form
│   └── /widgets/[widgetId]
│       ├── Settings tab — branding (primary colour, logo URL, CTA text)
│       ├── Embed tab    — copy/paste <script> snippet or <iframe> code
│       └── Analytics tab — sessions, completions, leads over time
├── /leads              — Incoming enquiries from all widgets
│   └── /leads/[leadId] — Spec details, elevation PNG, contact info, status update
├── /settings           — Tenant profile, billing plan, API keys, webhook URL
└── /settings/keys      — Rotate publishable / secret keys
```

### Key Admin API Routes (Next.js App Router)

```
POST   /api/embed/[key]/config           — public: return tenant catalogue config
POST   /api/embed/[key]/leads            — public: receive a lead submission
POST   /api/embed/[key]/sessions         — public: track session start/complete

GET    /api/admin/widgets                — tenant's widgets list
POST   /api/admin/widgets                — create widget
PATCH  /api/admin/widgets/[id]           — update config/branding
DELETE /api/admin/widgets/[id]

GET    /api/admin/leads                  — paginated lead list
PATCH  /api/admin/leads/[id]             — update status

GET    /api/admin/catalogues             — available ranges
PATCH  /api/admin/catalogues/[rangeSlug] — toggle active, layout overrides

GET    /api/admin/assets/upload-url      — presigned R2 upload URL (future custom assets)
```

### Embed Widget Configuration Object (JSONB)

```json
{
  "branding": {
    "primaryColor": "#1a2744",
    "accentColor": "#c9a94c",
    "logoUrl": "https://cdn.example.com/logo.png",
    "fontFamily": "inherit"
  },
  "cta": {
    "buttonLabel": "Get a Free Quote",
    "successMessage": "Thank you! We'll be in touch within 24 hours."
  },
  "allowedProductTypes": ["door", "window"],
  "allowedRanges": ["original", "gripcore"],
  "requireContact": true,
  "webhookUrl": "https://dealer-crm.example.com/hooks/frontage",
  "collectFields": ["name", "email", "phone"]
}
```

---

## 11. Open Work & Known Gaps

### Rendering

| Item                                                 | Status                                              |
| ---------------------------------------------------- | --------------------------------------------------- |
| Per-design HQ glass/aperture layers (Belfry 3, etc.) | ❌ Not scraped — only 90×200 option tiles available |
| GRiPCORE / Stable separate designer option sets      | ❌ Still using ORiGINAL designer.json               |
| Two threshold options missing images                 | ❌ Hidden but not removed                           |
| Letterplate Position 49 / bottom rail height         | ⚠️ Estimated from two captured positions            |
| Azure-only colour-burn filter accuracy               | ⚠️ Generic matrix for all other colours             |
| Window handle capture (external view)                | ❌ Capture data only exists for internal view       |

### Data

| Item                                                          | Status                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `finishes`, `hardware`, `variants`, `sideDesigns` in manifest | ⚠️ Partially populated                                             |
| Merion Farmhouse stable thumbnail                             | ❌ Missing                                                         |
| Muirfield / Troon / Medinah / Penina side shapes              | ⚠️ Cassette-file matches, not captured portal states               |
| Window glass unit bitmaps (toplights)                         | ⚠️ Cropped approximation; portal has no toplight-specific question |

### SaaS / Admin

| Item                                  | Status                              |
| ------------------------------------- | ----------------------------------- |
| Next.js project setup                 | ✅ Exists (reference in user query) |
| Database schema implemented           | ❌ Planned in this doc              |
| R2 bucket created and assets migrated | ❌ Not started                      |
| Embed bundle built                    | ❌ Not started                      |
| Admin portal routes                   | ❌ Not started                      |
| Auth (Supabase / Clerk)               | ❌ Not started                      |
| Lead webhook system                   | ❌ Not started                      |

---

## 12. Constraints to Never Break

1. **No prices, lead times, accounts, or checkout** in the configurator itself.
2. **Do not use Nationwide / Quotila / Doorco / Selecta marks** as the product identity.
3. **Do not invent stock.** Finishes must be from scraped data or labelled as samples.
4. **The elevation is the source of truth** — options change it, they do not replace it.
5. **Verify UI in the browser** after any visual change (desktop + tablet width).
6. **Asset hashes are immutable.** Never overwrite a stored asset at the same hash.
7. **Publishable keys are safe in HTML.** Secret keys must never appear in client bundles.
8. **Lead spec is a snapshot.** Never mutate a submitted spec; only add status updates.

---

_Last updated: 9 November 2026_
