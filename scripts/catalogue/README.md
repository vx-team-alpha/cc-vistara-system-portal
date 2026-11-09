# Catalogue import and storage seed

This pipeline imports the existing MVP data without scraping external services or
changing files in `cc-/`. Run from the project root with Node 22.16+ (or newer).
The ignored MVP folder must be present locally; it is not included in a clone.

```sh
# Apply the generated catalogue migration to the running local stack first:
supabase migration up --local

pnpm catalogue:prepare
pnpm catalogue:upload
pnpm catalogue:seed
```

`prepare` is offline. It generates seed JSON, prepared immutable storage objects,
an asset-path map, and a report in `.frontage-seed/`. Inspect `report.json` before
uploading: it contains table counts, unresolved local paths and snapshot URLs.
`upload` creates the public `frontage-assets` bucket if absent, uploads with six
workers and retries, and records a successful upload receipt. `seed` requires that
receipt and imports rows in foreign-key order using the service role. Repeating
upload/seed is safe: objects use SHA-256 paths and are never overwritten, catalogue
rows use deterministic UUIDs, and configurator types are matched by slug. Existing
assets and catalogue entries are never deleted. Failed batches can be rerun; the
REST import is resumable, not a single database transaction. Run it before exposing
the catalogue, as the portal may otherwise observe an incomplete import.

## Configuration

The scripts load `.env.local` without overriding exported environment variables.
Never put credentials in the generated files or a browser bundle.

| Environment variable | Default / purpose |
| --- | --- |
| `SUPABASE_URL` | Falls back to `NEXT_PUBLIC_SUPABASE_URL`; target API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for upload and seed; server-only service key |
| `FRONTAGE_SOURCE` | `cc-/web`; MVP web directory, relative to repo or absolute |
| `FRONTAGE_SEED_DIR` | `.frontage-seed`; generated artifacts |
| `FRONTAGE_ASSET_BUCKET` | `frontage-assets`; public catalogue assets only |
| `FRONTAGE_ASSET_BASE_URL` | Supabase public bucket URL; override for a CDN |

Preparing for a different host/bucket/CDN requires running all three steps again.
The script rejects a changed target between steps. Credentials come only from the
environment; preparation requires the target URL but no service key.

## Data and reference preservation

- Three door ranges, their geometry layouts, design categories, and door designs
  come from `src/catalog.json` and `public/catalogue/manifest.json`.
- Both window products include styles, base and glazed item questions, shared
  question contexts, and all conditional contexts captured by per-style walks.
- Questions stay separate for each source context. Defaults, component bindings,
  validation, option ordering, conditions and source IDs survive the import.
- `layouts.features.kind` distinguishes geometry `layout` rows from door `design`
  rows. `features.source`, `question_contexts`, `glazed_question_contexts` and
  `catalogue_contexts` preserve associations that have no dedicated schema tables.
  Base/glazed question contexts link their normalized question UUID and complete
  source question. Catalogue contexts link question UUIDs and capture scopes;
  the complete walk data remains in the uploaded JSON snapshots.
- `options.metadata` retains source option fields, including RGB/filter data and
  the rewritten image URLs. `external_id` retains the portal's IDs; these are not
  used as database primary keys because IDs repeat across contexts and ranges.
- All supported public binary files (including signature-detected extensionless JPEG/PNG images) and JSON documents are uploaded, including
  the symlinked `window-data` directory. SVG `href` and `xlink:href` dependencies
  and JSON asset references are rewritten to storage URLs before hashing.
- `asset-paths.json` maps original local paths and known portal image URLs to
  asset metadata and the new URL. Complete rewritten JSON snapshots are also
  uploaded, preserving variants, probes, render materials, coverage and other
  MVP fields that the current normalized schema does not model yet. Snapshot
  entry URLs are in `report.json`. Source JSON keys and original external IDs
  stay intact, allowing the MVP hydration logic to be adapted later.
- Unknown upstream image URLs remain external; the pipeline never invents images.
  Unresolved local paths are listed in the report. Missing source files required
  to build a range fail preparation.

The present database has no separate question-to-layout, variant, or asset-link
tables. Those relationships are retained in JSON fields/snapshots for now; future
portal rendering must read those contexts rather than flattening questions by name.
No accounts or sample homeowner leads are seeded.

Generated data is kept out of Git because it includes hundreds of thousands of
contextual options and target-specific storage URLs. The transformation scripts
and this guide are the reproducible seed source. After a database reset rerun
upload (to restore any removed bucket) and seed. These commands do not run
implicitly during `supabase db reset`.

The importer also uploads a compact original-path-to-public-URL map and registers
it in `assets.external_url` as `frontage://asset-map`. Public configurator loaders
select the latest map. This is a source identifier, not an upstream HTTP URL.
Reimport with the latest scripts before enabling the full rendering runtime.
