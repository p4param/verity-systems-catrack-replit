-- QM-WP02B-03: Proposal Highlights Workspace.
-- Adds the dedicated ProposalHighlight business entity (a repeatable,
-- reorderable list — Collection Authoring Pattern from QM-WP02B-01, not a
-- generic proposal engine) plus the workspace's own status column on
-- cat_quotations. Idempotent, matching existing convention.

ALTER TABLE "cat_quotations"
    ADD COLUMN IF NOT EXISTS "proposal_highlights_status" VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED';

CREATE TABLE IF NOT EXISTS "cat_quotation_proposal_highlights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "highlight_title" VARCHAR(255) NOT NULL,
    "highlight_description" TEXT NOT NULL,
    "internal_notes" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_quotation_proposal_highlights" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_quotation_proposal_highlights_quotation"
        FOREIGN KEY ("quotation_id") REFERENCES "cat_quotations"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_quotation_proposal_highlights_quotation"
    ON "cat_quotation_proposal_highlights" ("quotation_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_quotation_proposal_highlights_tenant"
    ON "cat_quotation_proposal_highlights" ("tenant_id");
