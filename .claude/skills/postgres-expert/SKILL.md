---
name: postgres-supabase-expert
description: Create, review, optimize, or test PostgreSQL and Supabase database code in this repo — schemas, RLS policies, grants, functions, triggers, and indexes. Use when designing tables, reviewing SQL for safety, implementing row-level security, writing security-definer functions, or optimizing query plans. Invoke with /postgres-supabase-expert or when the user mentions database, SQL, RLS, grants, or schema design.
---

# PostgreSQL & Supabase Expert

Design and review database code for **this** repo. The conventions below are not
general best practice — they are what this schema actually does, and several of
them are deliberate inversions of advice you would otherwise give.

**Migrations are out of scope here.** Generating, ordering, and applying them is
owned by the `supabase-db-changes` skill. Read that before touching
`supabase/migrations/`. The one rule worth repeating: schema files are the source
of truth, and migrations are *generated* from them via `pnpm supabase:diff` —
never hand-written.

## The schema in one paragraph

This is a **single-tenant** boilerplate. `public.accounts` is the only
application table; its `id` **is** the `auth.users` id (not a surrogate key), so
every ownership check is `id = (select auth.uid())` with no join and no helper
function. There is no workspace, membership, team, or role model. Authorization
is always "is this your row?", answered by RLS.

Six columns: `id`, `name`, `email`, `picture_url`, `created_at`, `updated_at`.

## File layout (`supabase/schemas/`)

Loaded **alphabetically** by the CLI, which is load-bearing: a `language sql`
function body is parsed at CREATE time (`check_function_bodies` is on), so the
tables it references must already exist.

| File | Contents |
|---|---|
| `010-accounts.sql` | The table. |
| `100-functions.sql` | `current_account()`. Must sort after the table. |
| `200-triggers.sql` | Trigger functions + triggers on **public** tables. |
| `210-auth-triggers.sql` | Triggers on **`auth.users`** only. |
| `900-rls.sql` | `enable row level security` + policies. **No grants.** |
| `999-grants.sql` | Every `grant`/`revoke` in the schema. Nothing else. |

Adding a function means editing **two** files: the body in `100-functions.sql`,
and both a `revoke` and (if callable) a `grant` in `999-grants.sql`.

## Non-negotiable rules

1. **All ACLs live in `999-grants.sql`.** Files load alphabetically and pg-delta
   diffs the *final* state, so a `revoke` in `900-rls.sql` is silently undone by
   a later `grant`. One file is the last word.

2. **Never add `force row level security`.** It reads like hardening and is the
   opposite: RLS exempting the table owner is precisely what lets
   security-definer helpers read the table without re-entering the policy that
   called them. Force it and the policy recurses infinitely.

3. **Every security-definer function pins `set search_path = ''`** and
   schema-qualifies every reference — including casts. A definer function with a
   mutable search_path is a privilege-escalation vector.

4. **Wrap `auth.uid()` as `(select auth.uid())`.** The scalar subquery makes the
   planner evaluate it once per statement as an InitPlan instead of once per row
   scanned. This matters more than it looks on any table that grows.

5. **`anon` gets nothing.** Not one privilege, on any object. Policies are also
   scoped `to authenticated`; denying at the grant layer too is deliberate,
   because a table grant with no matching policy returns *zero rows* instead of
   an error — a far worse failure mode to debug than "permission denied".

6. **New tables get no grants implicitly.** `auto_expose_new_tables` is unset in
   `config.toml` and pg-delta does not honour `alter default privileges`. A
   perfect RLS policy with no `grant` produces "permission denied for table" on
   every request.

## Column grants do the work a WITH CHECK cannot

A `with check` clause cannot see the OLD row, so it cannot express "this column
did not change". Immutability comes from withholding the column from the UPDATE
grant:

```sql
grant update (name, picture_url) on public.accounts to authenticated;
```

`id` is absent so a row cannot be re-pointed at another user. `email` is absent
because it mirrors `auth.users.email` and is maintained by trigger — a client
that could write it could point their profile at an address they never proved
they control. Email changes go through `supabase.auth.updateUser()`, which
verifies ownership and then feeds the trigger.

Column privileges apply to any column **referenced** by a statement, not just
those in the select-list — a `where` clause counts. Widening a column grant to
fix a "permission denied" is almost always the wrong fix.

## Trigger functions must not throw

`handle_new_user()` and `handle_user_email_change()` run **inside GoTrue's own
transaction**. Any exception surfaces to the user as "Database error saving new
user" and the signup fails outright. So:

- `on conflict do nothing` — idempotent against replays.
- Coalesce every input: `new.email` is nullable (phone-only signup), and
  `raw_user_meta_data` is whatever the client passed to `signUp()` — it is
  attacker-controlled, so treat it as display strings only, never authorization.
- A missing target row must be a no-op, not an error.

Trigger functions get **no** `grant`. EXECUTE on a trigger function is checked at
`create trigger` time, not when it fires, so revoking is safe — and it keeps them
off the PostgREST `/rpc/` surface, where `authenticated` could otherwise POST to
`/rest/v1/rpc/handle_new_user`.

## Verifying without a running stack

`supabase start` is not always available. To prove schema files parse, load and
enforce correctly, load them into a throwaway cluster with stub `auth` objects
(`auth.users`, `auth.uid()`, `auth.jwt()`, the three roles), then `set role
authenticated` and assert isolation. Redefining `auth.uid()` to return a chosen
uuid is how you impersonate a user.

The critical detail: **`set role` is required**. Setting JWT claims alone leaves
the session as `postgres`, which has BYPASSRLS — every "RLS denies this"
assertion then passes vacuously.

See `[Examples](examples.md)` for the real schema excerpts and a worked
verification script.

## Reference

See `[Reference](reference.md)` for the current object inventory (tables,
functions, triggers, policies, grants), the role model, the command list, and
local-stack troubleshooting.
