-- QM-WP01: Quotation Foundation.
-- Business flow: Relationship -> Inquiry -> Quotation (1..N) -> QuotationRevision (1..N).
-- Idempotent, matching the existing cat_inquiries migration convention.

CREATE TABLE IF NOT EXISTS "cat_quotations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quotation_number" VARCHAR(50) NOT NULL,
    "inquiry_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "purpose" VARCHAR(50) NOT NULL DEFAULT 'STANDARD_PROPOSAL',
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT "pk_cat_quotations" PRIMARY KEY ("id"),
    CONSTRAINT "uq_cat_quotations_tenant_number" UNIQUE ("tenant_id", "quotation_number"),
    CONSTRAINT "fk_cat_quotations_inquiry"
        FOREIGN KEY ("inquiry_id") REFERENCES "cat_inquiries"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_cat_quotations_tenant_deleted"
    ON "cat_quotations" ("tenant_id", "is_deleted");
CREATE INDEX IF NOT EXISTS "idx_cat_quotations_inquiry"
    ON "cat_quotations" ("inquiry_id");
CREATE INDEX IF NOT EXISTS "idx_cat_quotations_tenant_status"
    ON "cat_quotations" ("tenant_id", "status");

-- QuotationRevision — foundation only. Revision 0 is created automatically
-- whenever a Quotation is created. No revision workflow, comparison, or
-- negotiation functionality exists at this stage; only one revision is ever
-- current per quotation (enforced by the partial unique index below).
CREATE TABLE IF NOT EXISTS "cat_quotation_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "is_current" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "pk_cat_quotation_revisions" PRIMARY KEY ("id"),
    CONSTRAINT "uq_cat_quotation_revisions_number" UNIQUE ("quotation_id", "revision_number"),
    CONSTRAINT "fk_cat_quotation_revisions_quotation"
        FOREIGN KEY ("quotation_id") REFERENCES "cat_quotations"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_quotation_revisions_quotation"
    ON "cat_quotation_revisions" ("quotation_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_cat_quotation_revisions_current"
    ON "cat_quotation_revisions" ("quotation_id")
    WHERE "is_current" = TRUE;
