-- CAT inquiry foundation: required by /api/cat/inquiries.
-- Idempotent so environments that were provisioned manually remain deployable.
CREATE TABLE IF NOT EXISTS "cat_inquiries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "inquiry_number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "relationship_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "tentative_event_date" TIMESTAMPTZ,
    "venue" VARCHAR(255),
    "expected_guest_count" INTEGER,
    "budget_range" VARCHAR(100),
    "priority" VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    "inquiry_stage" VARCHAR(100) NOT NULL DEFAULT 'NEW',
    "assigned_salesperson" VARCHAR(255),
    "inquiry_source" VARCHAR(100),
    "service_style" VARCHAR(100),
    "food_preference" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT "pk_cat_inquiries" PRIMARY KEY ("id"),
    CONSTRAINT "uq_cat_inquiries_tenant_number" UNIQUE ("tenant_id", "inquiry_number"),
    CONSTRAINT "fk_cat_inquiries_relationship"
        FOREIGN KEY ("relationship_id") REFERENCES "cat_relationships"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_cat_inquiries_tenant_deleted"
    ON "cat_inquiries" ("tenant_id", "is_deleted");
CREATE INDEX IF NOT EXISTS "idx_cat_inquiries_tenant_stage"
    ON "cat_inquiries" ("tenant_id", "inquiry_stage");
CREATE INDEX IF NOT EXISTS "idx_cat_inquiries_relationship"
    ON "cat_inquiries" ("relationship_id");