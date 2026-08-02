-- EM-WP05: Menu Catalog.
-- The organization's Menu Catalog — reusable master data, independent of
-- Events and Menu Templates. No foreign key exists (or should ever exist)
-- from cat_event_menu_items / cat_menu_template_items back to this table:
-- "Choose From Catalog" copies field values in at add-time only, so
-- Catalog edits can never affect an already-added Event or Template menu
-- item. Single flat entity — no child tables, no versioning, no recipes,
-- no costing.

CREATE TABLE IF NOT EXISTS "cat_menu_catalog_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(255),
    "cuisine" VARCHAR(255),
    "dietary_type" VARCHAR(50) NOT NULL DEFAULT 'VEG',
    "dietary_notes" TEXT,
    "default_unit" VARCHAR(50),
    "serving_notes" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "pk_cat_menu_catalog_items" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_items_tenant" ON "cat_menu_catalog_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_items_name" ON "cat_menu_catalog_items" ("tenant_id", "name");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_items_category" ON "cat_menu_catalog_items" ("tenant_id", "category");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_catalog_items_status" ON "cat_menu_catalog_items" ("tenant_id", "status");
