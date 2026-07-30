-- QM-WP02B-01: Scope of Services Workspace.
-- Adds the dedicated ScopeServiceBlock business entity (a repeatable,
-- reorderable list — not a generic proposal-section table) plus the
-- workspace's own status column on cat_quotations, following the same
-- per-workspace status convention established by QM-WP02A's
-- executive_summary_status. Idempotent, matching existing convention.

ALTER TABLE "cat_quotations"
    ADD COLUMN IF NOT EXISTS "scope_of_services_status" VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED';

CREATE TABLE IF NOT EXISTS "cat_quotation_scope_service_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "block_title" VARCHAR(255) NOT NULL,
    "customer_description" TEXT NOT NULL,
    "internal_notes" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_quotation_scope_service_blocks" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_quotation_scope_service_blocks_quotation"
        FOREIGN KEY ("quotation_id") REFERENCES "cat_quotations"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_quotation_scope_service_blocks_quotation"
    ON "cat_quotation_scope_service_blocks" ("quotation_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_quotation_scope_service_blocks_tenant"
    ON "cat_quotation_scope_service_blocks" ("tenant_id");
