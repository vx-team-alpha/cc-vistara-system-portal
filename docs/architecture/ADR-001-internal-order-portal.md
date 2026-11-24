# ADR-001: Replace the embed portal with an internal order portal

- Status: Accepted
- Decision date: 2026-11-23

## Context

The existing portal manages public door/window embed components, tracks sessions and receives homeowner enquiries. The business now needs a Focus-style internal workflow where authenticated staff create customer orders and configure doors directly.

## Decision

The product will use an order-centered architecture with three top-level destinations: Overview, Quotes and Settings.

Public embeds, widget management, public quote capture, visitor analytics and windows are removed. The existing Designer is replaced by a New Order flow. The first release supports Eurocell; Rehau is disabled. Pricing and multi-user administration are excluded.

## Consequences

- `leads`, `embed_widgets` and `widget_views` are replaced by customer/order domain tables.
- The reusable door renderer and question engine are retained but decoupled from widget IDs, public keys and iframe behavior.
- Operational order metrics replace marketing analytics.
- The Quotes label represents the full order register even after confirmation.
- Existing embed records are deleted and are not migrated.
- Authentication and the account model remain.

## Rejected alternatives

### Preserve embeds beside internal orders

Rejected because it keeps two product models, duplicate configuration entry points and unnecessary public security/analytics infrastructure.

### Convert every old lead into an order

Rejected because the user will supply a new database and explicitly requested removal of embed data.

### Start with separate Quote and Order aggregates

Rejected for the first release because there is no pricing and conversion would duplicate customer and configuration state. One Order aggregate changes status through the lifecycle.
