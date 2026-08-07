-- PM-WP04A — Vendor Recommendation Enhancement.
--
-- Replaces the boolean is_preferred with an ordered Priority. Phased
-- migration per the frozen Engineering Package: priority is added
-- alongside is_preferred, backfilled once, and from this point on every
-- new code path reads/writes priority exclusively. is_preferred is kept
-- only as a rollback safety net — frozen, never written by new code
-- again — and is dropped entirely in a later, separate work package
-- once Priority has proven out.
--
-- priority is nullable: "No Recommendation" (no explicit rank) is a
-- valid, common state — not every Vendor-Ingredient link needs one.
--
-- Deliberately NO database-level uniqueness constraint on
-- (ingredient_id) WHERE priority = 1, reversing an earlier draft of
-- this design. At-most-one-Priority-1-Vendor is enforced entirely at
-- the write-operation level (the five domain operations all guarantee
-- it by construction) — not at the schema level. This was proven out,
-- not just theorized: this exact migration, run against real demo data,
-- failed against a partial unique index because the existing "Coriander"
-- demo scenario has two Vendors both is_preferred = true (a deliberate
-- PM-WP02D fixture demonstrating the ambiguous-preference case). A hard
-- constraint would have made it impossible to even complete this
-- migration without silently picking a winner between them — exactly
-- the kind of silent business decision this system's philosophy
-- rejects. The engine's MULTIPLE_PRIORITY_1_VENDORS status exists
-- precisely to surface this ambiguity to a human when it occurs
-- (through legacy data, a migration, or direct manipulation) rather
-- than have the database refuse to store it at all.

ALTER TABLE "cat_vendor_ingredients" ADD COLUMN IF NOT EXISTS "priority" INTEGER;

UPDATE "cat_vendor_ingredients" SET "priority" = 1 WHERE "is_preferred" = true AND "priority" IS NULL;
