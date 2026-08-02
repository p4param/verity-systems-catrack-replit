-- EM-WP04: Menu Templates.
-- Menu Templates are first-class business entities with their own
-- Directory and Workspace — NOT a hidden utility of the Event Menu
-- Planning workspace, and NOT FK'd to cat_events in any way. Persistence
-- is a structural mirror of the EM-WP03 Event menu tables (Meals ->
-- Categories -> Menu Items, Dietary Requirements, Service Instructions)
-- but scoped by template_id instead of event_id, so Templates and Events
-- remain completely independent storage: "Saving an Event as a Template"
-- and "Applying a Template to an Event" are both snapshot-copy operations
-- performed in application code (full deep copy into new rows with new
-- ids), never a foreign key or shared row. No versioning, no revision
-- history, no workflow — Templates are editable in place like Event Menu
-- Planning.

CREATE TABLE IF NOT EXISTS "cat_menu_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "pk_cat_menu_templates" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_cat_menu_templates_tenant" ON "cat_menu_templates" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_menu_template_meals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "meal_name" VARCHAR(255) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_menu_template_meals" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_menu_template_meals_template"
        FOREIGN KEY ("template_id") REFERENCES "cat_menu_templates"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_menu_template_meals_template" ON "cat_menu_template_meals" ("template_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_template_meals_tenant" ON "cat_menu_template_meals" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_menu_template_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "meal_id" UUID NOT NULL,
    "category_name" VARCHAR(255) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_menu_template_categories" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_menu_template_categories_template"
        FOREIGN KEY ("template_id") REFERENCES "cat_menu_templates"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_cat_menu_template_categories_meal"
        FOREIGN KEY ("meal_id") REFERENCES "cat_menu_template_meals"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_menu_template_categories_meal" ON "cat_menu_template_categories" ("meal_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_template_categories_template" ON "cat_menu_template_categories" ("template_id");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_template_categories_tenant" ON "cat_menu_template_categories" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_menu_template_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "quantity" NUMERIC(12,2),
    "unit" VARCHAR(50),
    "remarks" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_menu_template_items" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_menu_template_items_template"
        FOREIGN KEY ("template_id") REFERENCES "cat_menu_templates"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_cat_menu_template_items_category"
        FOREIGN KEY ("category_id") REFERENCES "cat_menu_template_categories"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_menu_template_items_category" ON "cat_menu_template_items" ("category_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_template_items_template" ON "cat_menu_template_items" ("template_id");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_template_items_tenant" ON "cat_menu_template_items" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_menu_template_dietary_requirements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "requirement" VARCHAR(255) NOT NULL,
    "guest_count" INTEGER,
    "notes" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_menu_template_dietary_requirements" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_menu_template_dietary_requirements_template"
        FOREIGN KEY ("template_id") REFERENCES "cat_menu_templates"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_menu_template_dietary_requirements_template"
    ON "cat_menu_template_dietary_requirements" ("template_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_menu_template_dietary_requirements_tenant"
    ON "cat_menu_template_dietary_requirements" ("tenant_id");

-- Service Instructions — free-form operational notes, singular per Template.
CREATE TABLE IF NOT EXISTS "cat_menu_template_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "service_instructions" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_menu_template_settings" PRIMARY KEY ("id"),
    CONSTRAINT "uq_cat_menu_template_settings_template" UNIQUE ("template_id"),
    CONSTRAINT "fk_cat_menu_template_settings_template"
        FOREIGN KEY ("template_id") REFERENCES "cat_menu_templates"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_menu_template_settings_tenant" ON "cat_menu_template_settings" ("tenant_id");
