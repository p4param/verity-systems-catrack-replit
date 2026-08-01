-- EM-WP03: Menu Planning.
-- Defines WHAT will be served (Event -> Meals -> Categories -> Menu Items),
-- not recipes, procurement, production, or costing. Normalized tables only
-- (no JSON). Every list table carries event_id directly (not just its
-- immediate parent id) so tenant-scoped queries never need to join through
-- intermediate levels, matching the convention established by EM-WP02's
-- planning tables. Cascade deletes at every level: removing a Meal removes
-- its Categories and their Menu Items; removing a Category removes its
-- Menu Items. No status/workflow/revision columns anywhere — Menu Planning
-- is editable-only, saved and reloaded as-is via a single GET/PUT pair.

CREATE TABLE IF NOT EXISTS "cat_event_meals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "meal_name" VARCHAR(255) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_event_meals" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_event_meals_event"
        FOREIGN KEY ("event_id") REFERENCES "cat_events"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_event_meals_event" ON "cat_event_meals" ("event_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_event_meals_tenant" ON "cat_event_meals" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_event_menu_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "meal_id" UUID NOT NULL,
    "category_name" VARCHAR(255) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_event_menu_categories" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_event_menu_categories_event"
        FOREIGN KEY ("event_id") REFERENCES "cat_events"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_cat_event_menu_categories_meal"
        FOREIGN KEY ("meal_id") REFERENCES "cat_event_meals"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_event_menu_categories_meal" ON "cat_event_menu_categories" ("meal_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_event_menu_categories_event" ON "cat_event_menu_categories" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_cat_event_menu_categories_tenant" ON "cat_event_menu_categories" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_event_menu_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
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
    CONSTRAINT "pk_cat_event_menu_items" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_event_menu_items_event"
        FOREIGN KEY ("event_id") REFERENCES "cat_events"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_cat_event_menu_items_category"
        FOREIGN KEY ("category_id") REFERENCES "cat_event_menu_categories"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_event_menu_items_category" ON "cat_event_menu_items" ("category_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_event_menu_items_event" ON "cat_event_menu_items" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_cat_event_menu_items_tenant" ON "cat_event_menu_items" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_event_dietary_requirements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "requirement" VARCHAR(255) NOT NULL,
    "guest_count" INTEGER,
    "notes" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_event_dietary_requirements" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_event_dietary_requirements_event"
        FOREIGN KEY ("event_id") REFERENCES "cat_events"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_event_dietary_requirements_event"
    ON "cat_event_dietary_requirements" ("event_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_event_dietary_requirements_tenant" ON "cat_event_dietary_requirements" ("tenant_id");

-- Service Instructions — free-form operational notes, singular per Event.
CREATE TABLE IF NOT EXISTS "cat_event_menu_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "service_instructions" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_event_menu_settings" PRIMARY KEY ("id"),
    CONSTRAINT "uq_cat_event_menu_settings_event" UNIQUE ("event_id"),
    CONSTRAINT "fk_cat_event_menu_settings_event"
        FOREIGN KEY ("event_id") REFERENCES "cat_events"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_event_menu_settings_tenant" ON "cat_event_menu_settings" ("tenant_id");
