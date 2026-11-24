# ADR-002: Version order specifications and manufacturing snapshots

- Status: Accepted
- Decision date: 2026-11-23

## Context

Door catalogue answers, visual assets, profile codes and manufacturing formulas can change. Production documents must continue to represent exactly what was issued and confirmed.

## Decision

Order items store both current database references and readable snapshots.

- Drafts use current referenced data and can be recalculated.
- Issuing an order stores an immutable specification and document revision.
- Confirming an order stores an immutable manufacturing snapshot for every item.
- Confirmed manufacturing inputs are locked.
- Reopening creates a new auditable revision rather than overwriting the confirmed one.

The manufacturing snapshot includes the rule-set identifier/version, system, dimensions, finishes, part codes, descriptions, quantities, cut sizes, end preparations, formulas and validation warnings.

## Consequences

- Historical documents are reproducible after catalogue changes.
- Current display can still follow live references while editing a draft.
- More data is stored per item, but it is bounded and operationally valuable.
- Document generation must target an explicit order revision.
- Silent fallback to default dimensions, colours, drawings or part codes is prohibited.
