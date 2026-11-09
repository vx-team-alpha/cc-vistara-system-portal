# Frontage customer portal

Every authenticated account manages its own door and window embed components.
The account ID is the auth user ID; RLS is the authorization boundary.

## Routes and workflows

- `/home`: views, quote enquiries, conversion rate, active components, recent
  enquiries and component setup. All totals come from stored records.
- `/home/widgets`: create separate door/window components and manage their status.
- `/home/widgets/[id]`: name, website, public preview and copyable iframe snippet.
- `/home/quotes`: filter and page through homeowner enquiries.
- `/home/quotes/[id]`: immutable saved specification, contact details, status.
- `/home/settings`: existing account/security settings within the shared shell.
- `/embed/[key]`: public product selection and enquiry entry point for the component.
- `/api/embed/[key]`: public view tracking and quote submission, scoped server-side
  to an enabled widget. Service credentials stay on the server.

## Database

`embed_widgets` belongs to an account and a seeded configurator type.
`widget_views` records a unique browser session per widget, owned by the same
account. Leads reference widgets through a composite ownership foreign key.
Submitted specs cannot be edited by account clients; only status is writable.
Public callers cannot query account data directly. Counts describe tracked unique
widget sessions, not unique people. No fabricated chart values or prices.

## Design

Use portal-ui tokens, Geist fallback display font, engraved frames/dividers,
264px sidebar, compact controls, hatched bands and responsive mobile navigation.
Themes use data-theme and token overrides. New UI uses CSS Modules and Hugeicons.

## Delivery boundary

The public embed loads its selected product from the database and immutable storage
snapshots, then uses the ported MVP question and SVG mutation engines. Door style,
design, finish, glass, hardware, side sections and inside/outside views use captured
catalogue data. Window dependency contexts and inside/outside materials follow the
MVP flow. Rendering is indicative and retains the existing catalogue coverage gaps.
Submitted option IDs are checked server-side against the active source context;
labels, defaults and the saved specification are derived from catalogue data.
The quote detail page presents those saved choices as readable rows.

Runtime source is tracked in `src/lib/configurator/runtime/`; the application does
not import from the ignored MVP folder. The importer publishes the original-path
asset map at `frontage://asset-map` in the assets registry, enabling the renderer
to resolve original references after hashed uploads. Extensionless JPEG/PNG files
are detected from their signatures. Rerun prepare/upload/seed when deploying this
runtime onto a database populated by an older importer.

## Verification

- `pnpm typecheck`, focused ESLint and `pnpm build` validate application code.
- `supabase/tests/portal-isolation.sql` runs inside a rolled-back transaction and
  checks account isolation, analytics write protection, immutable quote specs,
  writable status, composite ownership attribution and anonymous access denial.
- Pg-delta declarative sync must report no schema changes after replay.
- Public POST validates the key, enabled state, product type, active catalogue,
  request size and contact fields. A honeypot and a per-widget submission cap
  reduce basic abuse; production deployment should add edge rate limiting and
  bot verification before making high-traffic embeds public.
- The website URL is a label, not an enforced domain allowlist. Quote collection
  is available on any website embedding the public URL; this is stated in the UI.
- A browser session is counted once per component. Reloads and submission retries
  do not create extra view or enquiry rows. Browser storage clearing starts a new
  session. These are tracked sessions, not verified unique people.

Run the local integration checks with:

```sh
docker exec -i supabase_db_cc-frontage-desgn psql -U postgres -d postgres < supabase/tests/portal-isolation.sql
pnpm build
pnpm start --port 3018
# In a second terminal:
node scripts/portal/smoke.mjs
```

The smoke script requires local Supabase, creates a temporary confirmed user,
exercises authenticated pages and public capture endpoints, and removes its data.
Browser visual checks at desktop and tablet widths remain a separate check.

Runtime tests use prepared seed data and a DOM implementation:

```sh
node --test scripts/portal/render.test.mjs
```

These checks cover door finish changes, window glazing dependencies and both
faces, SVG sanitization, and forged-selection rejection. They do not replace a
desktop/tablet browser review of the rendered products.
