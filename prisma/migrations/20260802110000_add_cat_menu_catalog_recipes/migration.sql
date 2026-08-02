-- EM-WP06: Recipe Management.
-- Recipes define HOW a dish is produced — not procurement, inventory,
-- costing, or production execution. A Menu Catalog Item can have multiple
-- user-named Recipe Variants; exactly one is the Default Variant,
-- enforced by the partial unique index below (at most one is_default=true
-- per catalog item at the DB level) plus application-level validation
-- (at least one, when variants exist). Ingredients are free-text rows —
-- no Ingredient Master. Normalized tables only, no JSON. No versioning,
-- no workflow.

CREATE TABLE IF NOT EXISTS "cat_menu_catalog_recipe_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "catalog_item_id" UUID NOT NULL,
    "variant_name" VARCHAR(255) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "recipe_summary" TEXT,
    "yield_quantity" NUMERIC(12,2),
    "yield_unit" VARCHAR(50),
    "yield_notes" TEXT,
    "quality_notes" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_menu_catalog_recipe_variants" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_menu_catalog_recipe_variants_item"
        FOREIGN KEY ("catalog_item_id") REFERENCES "cat_menu_catalog_items"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_recipe_variants_item"
    ON "cat_menu_catalog_recipe_variants" ("catalog_item_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_recipe_variants_tenant" ON "cat_menu_catalog_recipe_variants" ("tenant_id");

-- Exactly one Default Variant per catalog item: at most one row with
-- is_default = true can exist per catalog_item_id. "At least one, when
-- variants exist" is enforced in the PUT handler (application code),
-- since a partial unique index cannot express that half of the rule.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_cat_menu_catalog_recipe_variants_one_default"
    ON "cat_menu_catalog_recipe_variants" ("catalog_item_id")
    WHERE "is_default" = true;

CREATE TABLE IF NOT EXISTS "cat_menu_catalog_recipe_ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "catalog_item_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "ingredient_name" VARCHAR(255) NOT NULL,
    "quantity" NUMERIC(12,2),
    "unit" VARCHAR(50),
    "notes" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_menu_catalog_recipe_ingredients" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_menu_catalog_recipe_ingredients_item"
        FOREIGN KEY ("catalog_item_id") REFERENCES "cat_menu_catalog_items"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_cat_menu_catalog_recipe_ingredients_variant"
        FOREIGN KEY ("variant_id") REFERENCES "cat_menu_catalog_recipe_variants"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_recipe_ingredients_variant"
    ON "cat_menu_catalog_recipe_ingredients" ("variant_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_recipe_ingredients_item" ON "cat_menu_catalog_recipe_ingredients" ("catalog_item_id");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_recipe_ingredients_tenant" ON "cat_menu_catalog_recipe_ingredients" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_menu_catalog_recipe_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "catalog_item_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "instruction" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_menu_catalog_recipe_steps" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_menu_catalog_recipe_steps_item"
        FOREIGN KEY ("catalog_item_id") REFERENCES "cat_menu_catalog_items"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_cat_menu_catalog_recipe_steps_variant"
        FOREIGN KEY ("variant_id") REFERENCES "cat_menu_catalog_recipe_variants"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_recipe_steps_variant"
    ON "cat_menu_catalog_recipe_steps" ("variant_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_recipe_steps_item" ON "cat_menu_catalog_recipe_steps" ("catalog_item_id");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_recipe_steps_tenant" ON "cat_menu_catalog_recipe_steps" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_menu_catalog_recipe_equipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "catalog_item_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "equipment_name" VARCHAR(255) NOT NULL,
    "notes" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_menu_catalog_recipe_equipment" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_menu_catalog_recipe_equipment_item"
        FOREIGN KEY ("catalog_item_id") REFERENCES "cat_menu_catalog_items"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_cat_menu_catalog_recipe_equipment_variant"
        FOREIGN KEY ("variant_id") REFERENCES "cat_menu_catalog_recipe_variants"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_recipe_equipment_variant"
    ON "cat_menu_catalog_recipe_equipment" ("variant_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_recipe_equipment_item" ON "cat_menu_catalog_recipe_equipment" ("catalog_item_id");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_recipe_equipment_tenant" ON "cat_menu_catalog_recipe_equipment" ("tenant_id");
