# ADR-003: Put manufacturing rules behind one service boundary

- Status: Accepted
- Decision date: 2026-11-23

## Context

Some Eurocell rules currently live in application code. A new database will be supplied and is intended to contain the durable catalogue, profile, part and formula data. Rehau data is incomplete for the first release.

## Decision

All order code calls one manufacturing service. The service may use verified code-backed Eurocell rules during database reconciliation, but the new database is the intended authority.

Only rule sets marked verified and enabled are selectable. Eurocell is enabled for rollout one. Rehau remains disabled until its profiles, suffixes, combinations, limits and fixture outputs are verified.

No manufacturing-rule editor is exposed in Settings.

## Consequences

- UI and order workflows do not depend on the physical location of rule data.
- Database reconciliation can replace code-backed rules without rewriting order pages.
- Rehau cannot accidentally generate incomplete works orders.
- Rule changes require controlled data/code delivery and fixture verification.
