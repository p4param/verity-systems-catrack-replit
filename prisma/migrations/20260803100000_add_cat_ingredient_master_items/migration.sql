-- EM-WP07: Ingredient Master.
-- Independent organizational master data — deliberately NOT connected to
-- Recipes, Procurement, or Inventory yet. A single flat entity, matching
-- the convention established by cat_menu_catalog_items (EM-WP05): no
-- child tables, no JSON, no generic master-data framework.

CREATE TABLE IF NOT EXISTS "cat_ingredient_master_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "ingredient_type" VARCHAR(255),
    "base_unit" VARCHAR(50),
    "purchase_unit" VARCHAR(50),
    "storage" VARCHAR(255),
    "shelf_life" VARCHAR(255),
    "food_characteristics" TEXT,
    "procurement_category" VARCHAR(255),
    "description" TEXT,
    "image_url" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "pk_cat_ingredient_master_items" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_cat_ingredient_master_items_tenant" ON "cat_ingredient_master_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_cat_ingredient_master_items_name" ON "cat_ingredient_master_items" ("tenant_id", "name");
CREATE INDEX IF NOT EXISTS "idx_cat_ingredient_master_items_type" ON "cat_ingredient_master_items" ("tenant_id", "ingredient_type");
CREATE INDEX IF NOT EXISTS "idx_cat_ingredient_master_items_status" ON "cat_ingredient_master_items" ("tenant_id", "status");
