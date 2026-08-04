# DD-001 Version History

Simple running log of Official Demo Dataset work packages. See
[README.md](./README.md) for the current script inventory and record counts.

## DD-001 v1.0 — Initial Demo Dataset
**Status:** Done

Seeded the first end-to-end Official Demo Dataset: Ingredient Master, Menu
Catalog, a partial Recipe Variant set, Menu Templates, Relationships,
Inquiries, Quotations, and Events spanning the full sales journey from first
contact through a converted, planned event.

## DD-001A — Production Recipe Enhancement
**Status:** Done — 2026-08-03

Brought Recipe Management to production quality ahead of EM-WP09 (Recipe
Scaling Engine). Closed every Menu Template/Event "broken production chain"
gap by adding Recipe Variants for the 51 Menu Catalog items templates
referenced but had no recipe for (50 identified up front, plus `Missi Roti`
caught by the new validation script), added a Jain variant to Paneer Butter
Masala, added the minimal set of genuinely-missing Ingredient Master items
each recipe required (18 new items), and introduced `verify-demo-dataset.ts`
as a permanent, repeatable validation script (chain integrity, orphan
checks, Default Variant integrity, recipe completeness, and a coverage
summary by cuisine/category). Recipe Variants grew from 66 to 118 across
101 dishes; Ingredient Master grew from 110 to 128 items. Verified via a
full reset → seed → validate → reseed cycle with identical, idempotent
results.

## DD-001B — Recipe Scaling Scenarios
**Status:** Planned

## DD-001C — Demand Planning Data
**Status:** Planned

## DD-001D — Procurement Data
**Status:** Planned

## DD-001E — Kitchen Production Data
**Status:** Planned
