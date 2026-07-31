-- QM-WP04D: Customer Decision.
-- Records what the customer decided about a published proposal revision.
-- Immutable, append-only log — a new decision never overwrites a previous
-- one (no UPDATE/DELETE endpoint exists for this table). Decisions may
-- only target an existing published revision (enforced via a composite FK
-- to cat_quotation_publications, same pattern as cat_quotation_proposal_deliveries),
-- never a working draft.

CREATE TABLE IF NOT EXISTS "cat_quotation_proposal_decisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "decision" VARCHAR(30) NOT NULL,
    "notes" TEXT,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" UUID,
    CONSTRAINT "pk_cat_quotation_proposal_decisions" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_quotation_proposal_decisions_quotation"
        FOREIGN KEY ("quotation_id") REFERENCES "cat_quotations"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_cat_quotation_proposal_decisions_publication"
        FOREIGN KEY ("quotation_id", "revision_number")
        REFERENCES "cat_quotation_publications"("quotation_id", "revision_number")
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_cat_quotation_proposal_decisions_quotation"
    ON "cat_quotation_proposal_decisions" ("quotation_id", "recorded_at" DESC);
