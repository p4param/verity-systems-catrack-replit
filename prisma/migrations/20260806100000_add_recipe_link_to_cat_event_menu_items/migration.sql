-- EM-WP09: Recipe Scaling — link Event Menu Items to a Menu Catalog Item
-- and a chosen Recipe Variant. Both nullable: "Create One-off Item" stays
-- fully supported as a free-text row with no recipe link. ON DELETE SET
-- NULL on both — a Menu Item never becomes invalid if the Catalog item or
-- Recipe Variant it pointed to is later deleted; it just loses its recipe
-- link gracefully. Menu Templates (cat_menu_template_items) are
-- intentionally not touched — Templates are guest-count-agnostic
-- blueprints; Recipe Scaling is an Event-specific calculation.

ALTER TABLE "cat_event_menu_items" ADD COLUMN IF NOT EXISTS "catalog_item_id" UUID;
ALTER TABLE "cat_event_menu_items" ADD COLUMN IF NOT EXISTS "recipe_variant_id" UUID;

ALTER TABLE "cat_event_menu_items"
    ADD CONSTRAINT "fk_cat_event_menu_items_catalog_item"
    FOREIGN KEY ("catalog_item_id") REFERENCES "cat_menu_catalog_items"("id") ON DELETE SET NULL;

ALTER TABLE "cat_event_menu_items"
    ADD CONSTRAINT "fk_cat_event_menu_items_recipe_variant"
    FOREIGN KEY ("recipe_variant_id") REFERENCES "cat_menu_catalog_recipe_variants"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_cat_event_menu_items_catalog_item" ON "cat_event_menu_items" ("catalog_item_id");
CREATE INDEX IF NOT EXISTS "idx_cat_event_menu_items_recipe_variant" ON "cat_event_menu_items" ("recipe_variant_id");
