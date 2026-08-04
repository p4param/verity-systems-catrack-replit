-- EM-WP08 follow-up: Ingredient Code.
-- Adds a stable, immutable, tenant-scoped display code to Ingredient
-- Master (ING-{YEAR}-{4-digit sequence}), matching the established
-- {PREFIX}-{YEAR}-{padded sequence} convention used by Inquiries,
-- Quotations, Cuisines, Venues, Service Styles, and Occasion Types.

ALTER TABLE "cat_ingredient_master_items" ADD COLUMN IF NOT EXISTS "ingredient_code" VARCHAR(50);

WITH numbered AS (
  SELECT id, tenant_id, created_at,
    ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id) AS seq
  FROM "cat_ingredient_master_items"
  WHERE "ingredient_code" IS NULL
)
UPDATE "cat_ingredient_master_items" t
SET "ingredient_code" = 'ING-' || EXTRACT(YEAR FROM n.created_at)::text || '-' || LPAD(n.seq::text, 4, '0')
FROM numbered n
WHERE t.id = n.id;

ALTER TABLE "cat_ingredient_master_items" ALTER COLUMN "ingredient_code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_cat_ingredient_master_items_code"
    ON "cat_ingredient_master_items" ("tenant_id", "ingredient_code");
