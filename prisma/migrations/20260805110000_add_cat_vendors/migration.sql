-- PM-WP01: Vendor Master.
-- A Vendor supplies business resources to the organization — Vendor
-- Master is deliberately NOT an Ingredient Supplier Master. cat_vendors
-- carries only identity, classification, contact, and commercial-terms
-- fields; nothing ingredient-specific lives here. What a Vendor supplies
-- is modeled as a separate, dedicated relationship table per resource
-- type — cat_vendor_ingredients is the only one built in V2.0. Future
-- resource types (Equipment, Packaging, Consumables, Rentals, Transport,
-- Services) each get their own sibling table later, following this same
-- shape — never a polymorphic resource_type/resource_id column, which
-- would give up real foreign-key integrity for a genericness nothing yet
-- needs. Vendor -> Resource relationships are owned by Vendor Master and
-- will later be read (never duplicated) by Purchase Planning.
-- Matches the EM-WP07 Ingredient Master convention: flat entity, no JSON,
-- no generic master-data framework, soft-deleted via is_deleted.

CREATE TABLE IF NOT EXISTS "cat_vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "vendor_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    -- Business Category: the Vendor's own trade classification (Food
    -- Supplier, Equipment Rental, Packaging, Transport, Cleaning,
    -- Utility, ...). Distinct from what the Vendor supplies (that's
    -- cat_vendor_ingredients / future sibling tables) — a Food Supplier
    -- and an Equipment Rental company are never confused just because
    -- both happen to also sell an ingredient-adjacent item.
    "business_category" VARCHAR(255),
    "contact_person" VARCHAR(255),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "address" TEXT,
    "city" VARCHAR(255),
    "state" VARCHAR(255),
    "tax_id" VARCHAR(100),
    -- Commercial terms merged into Overview per Product Review — no
    -- separate Commercial tab until there is meaningful functionality
    -- beyond a free-text field (rate cards, credit limits, etc. are
    -- future Procurement/Costing scope).
    "payment_terms" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "pk_cat_vendors" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_cat_vendors_tenant" ON "cat_vendors" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_cat_vendors_name" ON "cat_vendors" ("tenant_id", "name");
CREATE INDEX IF NOT EXISTS "idx_cat_vendors_business_category" ON "cat_vendors" ("tenant_id", "business_category");
CREATE INDEX IF NOT EXISTS "idx_cat_vendors_status" ON "cat_vendors" ("tenant_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_cat_vendors_code" ON "cat_vendors" ("tenant_id", "vendor_code");

-- Supply Portfolio (V2.0: Ingredients only). One row = "this Vendor
-- supplies this Ingredient Master item." A real FK, not a polymorphic
-- reference — this table's name and shape is deliberately specific so a
-- future cat_vendor_equipment / cat_vendor_packaging can be added the
-- same way without migrating this one.
CREATE TABLE IF NOT EXISTS "cat_vendor_ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_vendor_ingredients" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_vendor_ingredients_vendor"
        FOREIGN KEY ("vendor_id") REFERENCES "cat_vendors"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_cat_vendor_ingredients_ingredient"
        FOREIGN KEY ("ingredient_id") REFERENCES "cat_ingredient_master_items"("id") ON DELETE CASCADE,
    CONSTRAINT "uq_cat_vendor_ingredients_pair" UNIQUE ("vendor_id", "ingredient_id")
);

CREATE INDEX IF NOT EXISTS "idx_cat_vendor_ingredients_vendor" ON "cat_vendor_ingredients" ("vendor_id");
CREATE INDEX IF NOT EXISTS "idx_cat_vendor_ingredients_ingredient" ON "cat_vendor_ingredients" ("ingredient_id");
CREATE INDEX IF NOT EXISTS "idx_cat_vendor_ingredients_tenant" ON "cat_vendor_ingredients" ("tenant_id");
