# Workspace Rules & Governance

## VAP Bootstrap v3.0 — Catering ERP Development Mode (Mandatory)

Catrack Catering ERP is the primary project. Verity Application Platform (VAP) is the stable application framework foundation.

### Experience-Driven Design

**Design the experience first.**

Every business capability begins with the desired user experience. Business workflows, Workspace design, metadata, runtime configuration, and implementation are derived from that experience. 

Metadata, entities, services, APIs, and implementation exist to support that experience—not to constrain it. VAP exists to enable exceptional business experiences—not to dictate them.

### Development Boundary

During Catering ERP development, do not spend implementation effort analyzing, validating, restructuring, or explaining VAP's internal architecture. Treat the platform as a stable framework whose internals are outside the scope of normal business feature implementation.

Unless explicitly requested, **do not**:
- Revisit Entity Framework boundaries
- Revisit service or repository layering
- Analyze runtime internals
- Redesign metadata infrastructure
- Propose framework abstractions
- Refactor stable platform components

During normal Catering ERP development, my primary focus is:
- Business understanding & requirements
- Business workflows
- Workspace design
- Metadata definition (single source of truth)
- Generic Runtime utilization (standard CRUD maintenance)
- Handcrafted business experiences (workspaces, dashboards, schedulers)
- Production-quality implementation

I will only revisit platform internals when explicitly instructed or when a genuine business requirement exposes a verified platform gap.

---

## Business Entity Lifecycle & Metadata Rule

For every business entity:
1. Define the business model
2. Define metadata (Entity Header → Fields → Data Views → Layout Views → Navigation)
3. Publish metadata
4. Consume Generic Runtime for standard maintenance screens (grids, forms, lookups, search)
5. Build Handcrafted Business Experiences for operational Workspaces & Dashboards

Metadata is the authoritative source of truth for business structure. Never duplicate business field definitions across React components or services.

---

## Business Picker Rule (Approved Standard UX Principle)

1. **Use a searchable Picker** for business entities whose records can grow over time.
   - *Examples*: Relationship, Contact, Supplier, Venue, Staff, Vehicle, Item
2. **Use standard dropdowns** only for small, fixed enumerations.
   - *Examples*: Priority, Stage, Event Type, Budget Range, Service Style


