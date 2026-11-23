---
name: update-product-knowledge
description: Create or update this repo's product knowledge doc (`product_knowledge.md`) — the canonical plain-language description of what the product does and what users see. Use when bootstrapping the doc in a repo that has none, when routes/surfaces are added, removed, or renamed, when a feature ships or is descoped, when the pricing/entitlement/plan model changes, when a user-facing label renames a feature, when a new product term enters the vocabulary, or when the user asks to "update the product knowledge", "refresh the product knowledge doc", or mentions `product_knowledge.md` directly. Invoke with /update-product-knowledge.
---

# Product Knowledge: create & update

`product_knowledge.md` (repo root) is the canonical **product** description of whatever product
lives in this repo. It is the complement to the architecture doc (`ARCHITECTURE.md` /
`architecture.md`, if one exists): the architecture doc says **how the system is built**, this
doc says **what the user sees and does**. The two must never overlap.

This skill is **product-agnostic**. Nothing about the product — its name, its domain, its
surfaces, its vocabulary — is baked in here. You derive all of it from the repo you are standing
in, every time. If you find yourself recalling facts about a product from a previous session or
from another repo's version of this doc, stop: read the code instead.

## Step 0 — orient (always, before anything else)

Run this before both bootstrap and update. It takes a minute and prevents the whole failure mode
of this skill, which is writing confident sentences about a product you have not actually looked at.

1. **Find the doc.** `product_knowledge.md` at the repo root is the default. If
   `PRODUCT_KNOWLEDGE.md` or `docs/product_knowledge.md` already exists, edit _that_ — do not
   create a second one. If none exists, or it is an empty stub, you are in **bootstrap** mode.
2. **Find the app root.** The directory holding the route tree. Single-package repos: `src/app/`
   or `app/`. Monorepos: something like `apps/web/app/` or `<package>/app/`. Never assume — `ls`
   and confirm.
3. **Find the product's own words.** In rough order of value:
   - The landing page and marketing surfaces (`/`, `/product`, `/pricing`, `/about`).
   - The root layout's `metadata` (title, description) — this is usually how the product titles
     itself, and it settles brand capitalization.
   - `README.md`, `package.json` `name`/`description`, and any architecture doc.
4. **Find the entitlement model, if there is one.** Free vs paid, tiers, caps, quotas, seats,
   trials. Look at the pricing page, the plans/products seed data or billing config, and any
   permission helper in the database or server layer. In most products this is simultaneously the
   highest-value and highest-drift claim in the doc.
5. **Confirm the product framing with the user if it is genuinely ambiguous.** On a bootstrap into
   a young or boilerplate repo there may be nothing to read yet. Do not invent a product. Ask what
   it is, who it serves, and what the core user job is — then write from that plus the code.

## When this skill applies

Trigger an update whenever any of these is true:

- A route was added, removed, or renamed in the public or authenticated route trees.
- A surface materially changed what the user can do on it.
- The entitlement model changed — what a free account gets, what a paying account gets, what the
  caps and quotas are.
- A plan, price, or billing period changed.
- A feature graduated from in-development to shipped, or was descoped.
- A user-facing label changed, renaming a feature in the product's vocabulary.
- A new product term entered the vocabulary, or an existing term was renamed in copy.
- A coverage claim changed (supported integrations, regions, data sources, languages — whatever
  the product enumerates).

## Document structure

Five fixed top-level sections. The sub-structure inside each is discovered from the codebase, not
pre-committed here.

1. **Product Overview** — 1–2 pages. What the product is, the problem it solves, who it serves,
   the core domain hierarchy (the nouns the product is organized around and how they nest), the
   end-to-end user flow, the free-vs-paid model if there is one, and a main-feature-areas table.
2. **Public Area** — every unauthenticated surface, feature by feature.
3. **Authenticated Area** — every signed-in surface, in product-menu order.
4. **Cross-Cutting Capabilities** — things that span surfaces: entitlements and tiers, search and
   filtering, notifications and email, billing, integrations, mobile/companion apps.
5. **Glossary** — the product's vocabulary (see below).

A single `Last updated: YYYY-MM-DD` line sits at the very top, under the H1. It is the only
meta-information the doc carries. Sourcing context (paths walked, tickets consulted) belongs in
the commit message, not in the team-facing artefact.

If a section has no content in this product — no public area, no billing — omit the section rather
than writing "N/A". An empty heading is noise.

**Internal-only surfaces are not product.** Admin consoles gated to an employee allowlist, scratch
or spike routes, dev-only pages, superseded pages still in the tree: identify them during Step 0
and exclude them. Note the exclusion list in your response to the user, not in the doc.

## Per-feature template

Use this exact shape for every feature entry under Sections 2 and 3. Lead with narrative depth
before bullets — terse "What it is: X" lines without context are the failure mode.

```markdown
### [Feature Name]

[Opening paragraph, 2–4 sentences. What the feature is for and why it exists. Sounds like a
product owner explaining it, not a tour guide reading bullet points.]

[Concrete USP example, 1 short paragraph. A specific, real-feeling user in a specific situation,
showing the value — not "users can do X". Name the persona, give them a goal and a constraint,
and show what the surface tells them.]

**What the user can do:**

- concrete user actions (bulleted, with depth — not three-word stubs)

**Structure & screens:** tabs, filters, views, tables (where applicable).

**Connections:** how this surface links to or affects other parts of the product.

**Notes:** limitations, known gaps, planned changes (`currently in development`), status callouts.
```

The opening narrative and the USP example are non-negotiable for the product's main surfaces (the
core workflow, the primary public page, the pricing page). For minor surfaces — a settings page, a
feedback form — the opening narrative alone is enough; a USP example would be forced.

The fields are framed in user terms. "What the user can do" lists actions, not RPCs.
"Structure & screens" describes what is on the page, not which components render it.

**Notes** is where honest limitations go — quotas, caps, accuracy caveats, "this is an estimate,
not a guarantee". The audience is internal; marketing copy is not the goal.

## Glossary

Section 5 defines the product's vocabulary — every domain noun the doc uses that a new hire would
not already know. Derive the term list from the product's own UI copy and domain model, not from
your assumptions about the industry.

Rules:

- **One term per concept.** If the UI says "Unit" and the database says "GMU", pick the
  user-facing one and use it everywhere.
- **Define the terms that carry non-obvious meaning carefully.** In most products two or three
  terms look like synonyms but are mechanically distinct, and one term encodes the core business
  rule (usually the entitlement). Those deserve a paragraph, not a line.
- **State the entitlement rule plainly, in the glossary and in the overview.** Whatever the product
  gates and however it gates it, a reader must be able to say exactly what a free account gets
  versus a paying one after reading this doc once.
- **No orphans, no gaps.** Every term used in Sections 1–4 is either defined here or is
  unambiguously plain English.

## Tone and brand rules

- **Plain product language only.** No code, SQL, API endpoints, route paths, component names, or
  table names. If a fact only makes sense by referring to a database table or a file path, it does
  not belong in this doc. Say "a user's saved items", not `x_user_items`.
- **Brand consistency.** Write the product's name exactly as the product writes it — take the
  capitalization from the root layout's metadata title, and use that form every time. Lowercase
  forms are acceptable only inside literal URLs and email addresses.
- **Concrete over abstract.** Specific, checkable sentences beat "the system surfaces data".
- **Narrative depth before bullets.** Every substantive feature opens with descriptive narrative
  plus a concrete example, then the structured bullets.
- **No hype.** Avoid "revolutionary", "seamless", "best-in-class", and "AI-powered" as filler. The
  product's sophistication shows through depth, not adjectives.
- **No internal/process leakage.** No references to internal tooling, this skill, `CLAUDE.md`, PR
  numbers, GitHub usernames, or codebase paths inside the doc body.
- **Status mentioned inline.** Where a feature is in development or planned, say so directly in the
  prose. No coloured tags, no formal status fields.
- **Markdown discipline.** H3 (`###`) for feature names. The only H1 is the document title.
- **No character restrictions.** Em-dashes, en-dashes, and typographic quotes are all fine unless
  this repo's own docs or `CLAUDE.md` say otherwise.

## How to perform the work

### Bootstrap (no doc yet)

1. Complete Step 0.
2. Walk the full route tree. List every surface, then subtract the internal-only ones.
3. For each surface, read its page far enough to understand _what it offers the user_ — never far
   enough to understand its implementation.
4. Write all five sections from scratch, every feature using the template.
5. Confirm the entitlement model against code, not against the pricing page's marketing copy —
   pricing pages lie by omission more often than permission helpers do.
6. Set `Last updated:` to today's date.

### Targeted update (a specific surface changed)

1. **Locate the affected entry.** Grep the doc for the surface name or the glossary term.
2. **Re-derive the truth from code.** Read the changed route, the changed permission helper, the
   changed plan data — whatever the change actually touched. Translate into product language;
   never quote the source.
3. **Edit only the affected entry.** Do not opportunistically rewrite neighbours — they have their
   own truth and you may invalidate them by accident.
4. **Update `Last updated:`** to today's date.
5. **Update the Glossary** if the change introduced or renamed a term. Glossary edits propagate —
   sweep the rest of the doc for consistent usage.

### Periodic sweep (refresh)

1. **Walk the route tree** and diff it against Sections 2 and 3. Flag surfaces present in code but
   missing from the doc, and surfaces in the doc that no longer exist in code.
2. **Re-verify the entitlement section.** Highest-value, highest-drift claim in the doc.
3. **Refresh in-flight status.** For every `currently in development` entry, confirm it is still in
   development. Code is ground truth.
4. **Glossary sweep.** Add missing terms, remove orphans.
5. **Tone sweep.** Read end-to-end for hype, code/route leakage, narrative-first compliance, and
   consistent brand capitalization.
6. **Count claims.** Any sentence with a number in it ("supports 12 states", "three plan tiers")
   gets re-checked against the data that produces it, or gets rephrased without the number.

## Red flags — stop and reconsider

| Thought                                              | What to do instead                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| "I'll describe the `x_items` table"                  | Don't. Describe what the user sees on the page.                                     |
| "I should mention the RPC / API endpoint"            | Don't. Describe the action the user takes.                                          |
| "I'll say the engine is powerful and seamless"       | Drop the adjectives. Say what it does, concretely.                                  |
| "I'll lead with bullets and skip the narrative"      | Don't. Open with the descriptive paragraph and the concrete example.                |
| "I know what this product does from last time"       | You don't. Re-read the code — that's the whole point of the skill.                  |
| "These two terms mean the same thing"                | Check. The pair that looks synonymous is usually the pair that isn't.               |
| "I'll write 'supports 12 integrations'"              | Verify against whatever data drives that list, or phrase it without a number.       |
| "I'll introduce a term that fits better"             | Use the existing glossary term. If none fits, add one to the glossary first.        |
| "I'll document the admin console"                    | Don't, if it's gated to an internal allowlist. Not product.                         |
| "I'll fix that other entry while I'm here"           | Only if the targeted change actually invalidates it. Otherwise do a separate sweep. |
| "There's no entry for surface Y, but a route exists" | Add one with the full template. Read its page, then write in product language.      |
| "The repo is empty, I'll write something plausible"  | Never invent a product. Ask the user what it is.                                    |

## Commit workflow

Follow the repo's own conventions (branch protection, commit style, hooks). Absent anything
stricter:

1. Branch off `main` if you are not already on a feature branch.
2. Edit the doc.
3. Commit: `docs: update product knowledge for <surface or theme>` (or `docs: bootstrap product
   knowledge`).
4. Open a PR with `gh pr create`.

## What "done" looks like

- Every claim corresponds to a real, verified product fact in code (or, on bootstrap, to something
  the user told you directly).
- The `Last updated:` line shows today's date.
- The Glossary covers every product term used in Sections 1–4, with no orphans.
- A reader who has never seen the product can read Sections 1–4 standalone and understand it end to
  end — including exactly what a free account gets versus a paid one.
- No code, SQL, table name, route path, or component name appears anywhere in the doc.
- The product's name is capitalized consistently throughout.
- No internal-only surface is described.
