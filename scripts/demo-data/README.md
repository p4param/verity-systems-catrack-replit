# Official Demo Dataset (DD-001)

## Purpose

DD-001 is the Official Demo Dataset for the Catrack Catering ERP. It seeds a
complete, realistic Indian catering business — Ingredient Master, Menu
Catalog, Recipe Variants, Menu Templates, Relationships, Inquiries,
Quotations, and Events — spanning the full sales journey from first contact
through a converted, planned event.

The dataset is realistic enough for customer demonstrations, screenshots,
and documentation without anyone recognizing it as artificial demo content.
It is intended **only** for development, QA, demonstrations, screenshots,
documentation, and training environments — never for production tenants.

## Dependency Order

The dataset has a strict build order because later entities reference
earlier ones (Relationships → Inquiries → Quotations → Events; Ingredient
Master → Recipe Variants → Menu Catalog → Menu Templates use their own
independent chain):

1. Ingredient Master
2. Menu Catalog
3. Recipe Variants (depends on Menu Catalog)
4. Menu Templates (depends on Menu Catalog for item names)
5. Relationships (with primary Contacts)
6. Inquiries (depends on Relationships)
7. Quotations (depends on Inquiries; publishes, delivers, and accepts each one)
8. Events (depends on accepted Quotations; converts each one into a planned Event)

Reset runs in the exact reverse order — see [seed-demo-reset.ts](../seed-demo-reset.ts).

## Available Scripts

All scripts live in `scripts/` and are run with `npx tsx`.

| Script | Purpose |
| --- | --- |
| `seed-demo-ingredient-master.ts` | Seeds ~100 Ingredient Master items (Purchased, Produced, Packaged, Consumables). |
| `seed-demo-menu-catalog.ts` | Seeds ~150 Menu Catalog dishes across categories and cuisines. |
| `seed-demo-recipe-variants.ts` | Seeds Recipe Variants (ingredients, steps, equipment) for a subset of Menu Catalog dishes. |
| `seed-demo-menu-templates.ts` | Seeds ~15 Menu Templates built from Menu Catalog items. |
| `seed-demo-relationships.ts` | Seeds 10 Relationships, each with a primary Contact. |
| `seed-demo-inquiries.ts` | Seeds 10 Inquiries against the demo Relationships. |
| `seed-demo-quotations.ts` | Seeds 10 Quotations: publishes, delivers, and records customer acceptance for each. |
| `seed-demo-events.ts` | Converts each accepted demo Quotation into an Event with Planning and Menu applied. |
| `seed-demo-all.ts` | Orchestrator — runs all eight seed scripts above in dependency order. |
| `seed-demo-reset.ts` | Removes ONLY the Official Demo Dataset, in reverse dependency order. Never touches customer/business data. |
| `verify-demo-dataset.ts` | Read-only validation (DD-001A) — confirms every Menu Template/Event item resolves through a Recipe Variant to Ingredient Master, no orphan rows, no duplicate/missing Default Variants, and every Recipe Variant is complete (summary, yield, ingredients, steps, equipment). Prints a non-blocking Recipe Coverage Summary by cuisine/category. |

## Execution Examples

```bash
# Seed everything (full dataset, in dependency order)
npx tsx scripts/seed-demo-all.ts

# Reset everything (removes only demo rows, safe to rerun anytime)
npx tsx scripts/seed-demo-reset.ts

# Seed only Ingredient Master
npx tsx scripts/seed-demo-ingredient-master.ts

# Seed only Menu Catalog
npx tsx scripts/seed-demo-menu-catalog.ts

# Seed only Menu Templates
npx tsx scripts/seed-demo-menu-templates.ts

# Seed only Events (requires demo Quotations to already exist and be accepted)
npx tsx scripts/seed-demo-events.ts

# Validate the dataset (read-only — no broken chains, no incomplete recipes)
npx tsx scripts/verify-demo-dataset.ts
```

## Expected Dataset

Approximate record counts produced by a full `seed-demo-all.ts` run (updated
by DD-001A — see [CHANGELOG.md](./CHANGELOG.md)):

| Entity | Count |
| --- | --- |
| Ingredient Master | 128 |
| Menu Catalog | 155 |
| Recipe-covered Dishes | 101 |
| Recipe Variants | 118 |
| Menu Templates | 15 |
| Relationships (+ Contacts) | 10 |
| Inquiries | 10 |
| Quotations | 10 |
| Events | 10 |

Every Menu Catalog item referenced by a Menu Template (and therefore by
every Event built from one) now resolves through a complete Recipe →
Ingredient Master chain — see `verify-demo-dataset.ts`.

## Engineering Guidelines

- **Idempotent.** Every seed script upserts on a stable business key and
  every delete in the reset script is scoped by that same key — running any
  script multiple times, in any combination, never creates duplicates or
  errors.
- **Stable demo business codes.** Relationships, Inquiries, and Quotations
  carry dedicated demo codes (`REL-DEMO-*`, `INQ-DEMO-*`, `QT-DEMO-*`).
  Ingredient Master, Menu Catalog, and Menu Templates have no independent
  demo code — they are identified by the exact name lists exported from
  their own seed scripts (`ALL` / `TEMPLATES`), which `seed-demo-reset.ts`
  imports directly so the two stay in sync automatically. Events have no
  independent demo code either — they are identified transitively through
  their originating demo Quotation.
- **Safe to rerun.** Seeding twice reconciles in place; resetting twice is a
  no-op the second time; resetting a partially-seeded dataset cleans up
  whatever demo rows exist without erroring.
- **Never touches non-demo data.** The reset script matches only the exact
  stable codes/names above — rows belonging to real customers or business
  data are never selected, regardless of how much or how little demo data
  is present.
- **Development/QA use only.** These scripts are not part of the
  application's runtime behavior. They exist purely to stand up and tear
  down DD-001 for development, QA, demonstrations, screenshots,
  documentation, and training.

## Verification

To confirm the dataset is reproducible end-to-end:

1. Seed the demo dataset: `npx tsx scripts/seed-demo-all.ts`
2. Run the reset: `npx tsx scripts/seed-demo-reset.ts`
3. Confirm demo data was removed (record counts for all DD-001 entities are 0; any non-demo/customer data is untouched).
4. Seed again: `npx tsx scripts/seed-demo-all.ts`
5. Confirm the dataset was recreated identically (same record counts as the original run).
