-- PM-WP03B — Purchase Order Management.
--
-- A Purchase Order is a persisted commercial commitment ("this Vendor
-- will supply this quantity of this ingredient"), not a logistics
-- document. It is the first entity in the Sales -> Operations ->
-- Procurement chain that is not recomputed on every request — everything
-- upstream (Production Center, Purchase Planning) remains a live report
-- with zero persistence and zero side effects.
--
-- No price/amount/currency column anywhere: Vendor Master carries no
-- rate-card and Purchase Planning carries no pricing, so a PO built on
-- top of both cannot honestly carry a number that doesn't exist upstream
-- yet. That is deferred to a future Costing module, not fabricated here.
--
-- Vendor is editable while status = 'DRAFT' and becomes immutable the
-- instant Approval happens — enforced at the application layer (like
-- every other invariant on cat_* tables), not by a DB trigger.
--
-- origin ('PLANNING' | 'MANUAL') records how the Draft began and never
-- changes afterward. work_date is nullable: populated from Purchase
-- Planning context when origin = 'PLANNING', freely optional and
-- unvalidated against any real date when origin = 'MANUAL'.

CREATE TABLE IF NOT EXISTS "cat_purchase_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "po_number" VARCHAR(50) NOT NULL,
    "origin" VARCHAR(20) NOT NULL DEFAULT 'PLANNING',
    "vendor_id" UUID NOT NULL,
    "work_date" DATE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "approved_at" TIMESTAMPTZ,
    "approved_by" UUID,
    "issued_at" TIMESTAMPTZ,
    "issued_by" UUID,
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT "pk_cat_purchase_orders" PRIMARY KEY ("id"),
    CONSTRAINT "uq_cat_purchase_orders_tenant_number" UNIQUE ("tenant_id", "po_number"),
    CONSTRAINT "fk_cat_purchase_orders_vendor" FOREIGN KEY ("vendor_id") REFERENCES "cat_vendors"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_cat_purchase_orders_tenant_deleted" ON "cat_purchase_orders" ("tenant_id", "is_deleted");
CREATE INDEX IF NOT EXISTS "idx_cat_purchase_orders_tenant_status" ON "cat_purchase_orders" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_cat_purchase_orders_tenant_origin" ON "cat_purchase_orders" ("tenant_id", "origin");
CREATE INDEX IF NOT EXISTS "idx_cat_purchase_orders_vendor" ON "cat_purchase_orders" ("vendor_id");
CREATE INDEX IF NOT EXISTS "idx_cat_purchase_orders_work_date" ON "cat_purchase_orders" ("tenant_id", "work_date");

-- Child, owned by the aggregate root. ingredient_code/name/unit are
-- snapshotted at insert time (not always live-joined) — a Purchase Order
-- is a frozen record of what was ordered; it shouldn't silently reword
-- itself if the Ingredient Master item is later renamed. No price/amount
-- column, no per-item status (no Goods Receipt yet to drive one), no
-- soft-delete/version (child rows are hard-deleted/reconciled
-- individually while the parent PO is Draft, same as cat_quotation_revisions).
CREATE TABLE IF NOT EXISTS "cat_purchase_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "ingredient_code" VARCHAR(50) NOT NULL,
    "ingredient_name" VARCHAR(255) NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "quantity" NUMERIC(14,3) NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'PLANNING',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_purchase_order_items" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_purchase_order_items_po" FOREIGN KEY ("purchase_order_id") REFERENCES "cat_purchase_orders"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_cat_purchase_order_items_ingredient" FOREIGN KEY ("ingredient_id") REFERENCES "cat_ingredient_master_items"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_cat_purchase_order_items_po" ON "cat_purchase_order_items" ("purchase_order_id");
CREATE INDEX IF NOT EXISTS "idx_cat_purchase_order_items_tenant" ON "cat_purchase_order_items" ("tenant_id");
