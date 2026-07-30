-- QM-WP02B-04: Assumptions & Exclusions Workspace.
-- Adds two dedicated business entities (ProposalAssumption, ProposalExclusion)
-- — each a repeatable, reorderable list, following the Collection Authoring
-- Pattern from QM-WP02B-01, not a generic list-item abstraction — plus the
-- workspace's own status column on cat_quotations. Idempotent, matching
-- existing convention.

ALTER TABLE "cat_quotations"
    ADD COLUMN IF NOT EXISTS "assumptions_exclusions_status" VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED';

CREATE TABLE IF NOT EXISTS "cat_quotation_proposal_assumptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "statement" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_quotation_proposal_assumptions" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_quotation_proposal_assumptions_quotation"
        FOREIGN KEY ("quotation_id") REFERENCES "cat_quotations"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_quotation_proposal_assumptions_quotation"
    ON "cat_quotation_proposal_assumptions" ("quotation_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_quotation_proposal_assumptions_tenant"
    ON "cat_quotation_proposal_assumptions" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_quotation_proposal_exclusions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "statement" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_quotation_proposal_exclusions" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_quotation_proposal_exclusions_quotation"
        FOREIGN KEY ("quotation_id") REFERENCES "cat_quotations"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_quotation_proposal_exclusions_quotation"
    ON "cat_quotation_proposal_exclusions" ("quotation_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_quotation_proposal_exclusions_tenant"
    ON "cat_quotation_proposal_exclusions" ("tenant_id");
