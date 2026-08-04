-- EM-WP08: Link Recipe Ingredients to Ingredient Master.
-- Establishes the structural relationship between Recipe Variants and
-- Ingredient Master: each ingredient line now references a real
-- cat_ingredient_master_items row instead of a free-text name. Renames
-- unit -> recipe_unit (the measurement used within the recipe, distinct
-- from the Ingredient's Base Unit and Purchase Unit) and notes ->
-- preparation_instruction. No conversions, yield loss, costing,
-- substitutions, allergens, or inventory behavior.

ALTER TABLE "cat_menu_catalog_recipe_ingredients" ADD COLUMN IF NOT EXISTS "ingredient_id" UUID;

UPDATE "cat_menu_catalog_recipe_ingredients" r
SET "ingredient_id" = m.id
FROM "cat_ingredient_master_items" m
WHERE r."ingredient_id" IS NULL
  AND m."tenant_id" = r."tenant_id"
  AND m."name" = r."ingredient_name";

ALTER TABLE "cat_menu_catalog_recipe_ingredients" ALTER COLUMN "ingredient_id" SET NOT NULL;

ALTER TABLE "cat_menu_catalog_recipe_ingredients"
    ADD CONSTRAINT "fk_cat_menu_catalog_recipe_ingredients_ingredient"
    FOREIGN KEY ("ingredient_id") REFERENCES "cat_ingredient_master_items"("id") ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_recipe_ingredients_ingredient"
    ON "cat_menu_catalog_recipe_ingredients" ("ingredient_id");

ALTER TABLE "cat_menu_catalog_recipe_ingredients" RENAME COLUMN "unit" TO "recipe_unit";
ALTER TABLE "cat_menu_catalog_recipe_ingredients" RENAME COLUMN "notes" TO "preparation_instruction";

ALTER TABLE "cat_menu_catalog_recipe_ingredients" DROP COLUMN "ingredient_name";
