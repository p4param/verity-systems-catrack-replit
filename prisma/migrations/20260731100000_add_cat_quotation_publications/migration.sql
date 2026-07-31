-- QM-WP04A: Proposal Publication.
-- Publishing a Quotation creates an immutable ProposalPublication snapshot
-- and advances the Quotation to a new QuotationRevision. Revision history
-- is never stored on the Quotation itself; the Quotation remains editable.

CREATE TABLE IF NOT EXISTS "cat_quotation_publications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED',
    "snapshot_json" JSONB NOT NULL,
    "published_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by" UUID,
    CONSTRAINT "pk_cat_quotation_publications" PRIMARY KEY ("id"),
    CONSTRAINT "uq_cat_quotation_publications_revision" UNIQUE ("quotation_id", "revision_number"),
    CONSTRAINT "fk_cat_quotation_publications_quotation"
        FOREIGN KEY ("quotation_id") REFERENCES "cat_quotations"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_quotation_publications_quotation"
    ON "cat_quotation_publications" ("quotation_id");
