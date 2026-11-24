# Order domain glossary

## Business

The single organization represented by the authenticated account. Its identity and document settings live in a Business Profile.

## Business Profile

Business name, address, phone, logo, document details, timezone and order-number prefix. It is not a user-management record.

## Customer

A reusable person/contact record found by name or phone. Editing a Customer does not rewrite historical Orders.

## Customer Snapshot

The name, phone and address copied onto an Order when it is created. It preserves the details used for that order.

## Order

The aggregate that holds customer details, delivery information, status, one or more Door Items, events and document revisions. It begins as a Draft. In the UI, Orders are listed under the requested **Quotes** navigation label.

## Order Number

A business-prefixed sequential identifier allocated transactionally. It is distinct from the database UUID.

## Door Item

One configured door design with a single set of dimensions, location, options and manufacturing result. A Door Item can have a quantity greater than one when every unit is identical.

## Door Style / Layout

The structural arrangement and handing: single door, sidelight arrangement, toplight or double door. It is distinct from the decorative Slab Design.

## Slab Design

The decorative door leaf design selected after the layout, such as Carnoustie.

## Handing

The physical hinge/handle orientation of a door. Outside and inside drawings show the same physical handing from opposite viewpoints.

## Profile System

The frame system that determines compatible profiles and manufacturing rules. Eurocell is enabled in rollout one; Rehau is disabled.

## Frame Details

The user-entered overall width, overall height, quantity and location for a Door Item.

## Configuration

The selected catalogue answers and text inputs for a Door Item.

## Catalogue Snapshot

Readable layout, slab and option values preserved with a Door Item so later catalogue edits do not erase historical meaning.

## Manufacturing Snapshot

The immutable, versioned result frozen at confirmation: profile system, dimensions, finishes, part codes, descriptions, quantities, cuts, end preparations, formulas and warnings.

## Specification

The customer-readable, non-priced description of an Order and its Door Items. An Issued Specification is immutable.

## Order Confirmation

The confirmed customer-facing revision establishing the approved specification.

## Works Order

The production document containing drawings, dimensions, profiles, parts, quantities, cuts, end preparations, formulas and checks.

## Draft

Editable Order state. Drafts can be resumed or permanently deleted.

## Issued

The specification has been sent or presented to the customer. The issued document revision is immutable.

## Confirmed

The customer specification is approved and each Door Item has a frozen Manufacturing Snapshot.

## In production

Production work has begun. Manufacturing inputs remain locked.

## Completed

Production workflow is finished. The Order remains available as a historical record.

## Cancelled

The Order will not proceed. It is retained and can be duplicated into a new Draft.

## Delivery Date

The optional expected delivery date entered during intake. `created_at` is the automatic Order date.

## Order Event

An append-only record of a lifecycle transition or revision event.

## Document Revision

An immutable stored PDF/output associated with a specific Order revision and checksum.
