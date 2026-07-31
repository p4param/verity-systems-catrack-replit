-- QM-WP04B: Customer Delivery.
-- Every delivery of a published proposal revision (Email or PDF Download)
-- creates one ProposalDelivery record per recipient — a durable audit log.
-- Deliveries may only target an existing published revision (enforced via
-- a composite FK to cat_quotation_publications), never a working draft.

CREATE TABLE IF NOT EXISTS "cat_quotation_proposal_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "recipient_name" VARCHAR(255) NOT NULL,
    "recipient_email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255),
    "message" TEXT,
    "delivered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_by" UUID,
    CONSTRAINT "pk_cat_quotation_proposal_deliveries" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_quotation_proposal_deliveries_quotation"
        FOREIGN KEY ("quotation_id") REFERENCES "cat_quotations"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_cat_quotation_proposal_deliveries_publication"
        FOREIGN KEY ("quotation_id", "revision_number")
        REFERENCES "cat_quotation_publications"("quotation_id", "revision_number")
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_cat_quotation_proposal_deliveries_quotation"
    ON "cat_quotation_proposal_deliveries" ("quotation_id", "delivered_at" DESC);
