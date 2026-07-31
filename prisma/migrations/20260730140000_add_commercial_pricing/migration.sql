-- QM-WP03A: Commercial Pricing Workspace.
-- Adds three dedicated business entities (ProposalCharge, ProposalDiscount,
-- ProposalAdjustment) — each a repeatable, reorderable list, following the
-- Collection Authoring Pattern from QM-WP02B-01, not a generic pricing-line
-- abstraction — plus the workspace's own status column on cat_quotations.
-- Idempotent, matching existing convention.

ALTER TABLE "cat_quotations"
    ADD COLUMN IF NOT EXISTS "commercial_pricing_status" VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED';

CREATE TABLE IF NOT EXISTS "cat_quotation_proposal_charges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "amount" NUMERIC(12,2) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_quotation_proposal_charges" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_quotation_proposal_charges_quotation"
        FOREIGN KEY ("quotation_id") REFERENCES "cat_quotations"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_cat_quotation_proposal_charges_quotation"
    ON "cat_quotation_proposal_charges" ("quotation_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_quotation_proposal_charges_tenant"
    ON "cat_quotation_proposal_charges" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_quotation_proposal_discounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "amount" NUMERIC(12,2) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_quotation_proposal_discounts" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_quotation_proposal_discounts_quotation"
        FOREIGN KEY ("quotation_id") REFERENCES "cat_quotations"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_cat_quotation_proposal_discounts_quotation"
    ON "cat_quotation_proposal_discounts" ("quotation_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_quotation_proposal_discounts_tenant"
    ON "cat_quotation_proposal_discounts" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_quotation_proposal_adjustments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "amount" NUMERIC(12,2) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_quotation_proposal_adjustments" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_quotation_proposal_adjustments_quotation"
        FOREIGN KEY ("quotation_id") REFERENCES "cat_quotations"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_cat_quotation_proposal_adjustments_quotation"
    ON "cat_quotation_proposal_adjustments" ("quotation_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_quotation_proposal_adjustments_tenant"
    ON "cat_quotation_proposal_adjustments" ("tenant_id");
