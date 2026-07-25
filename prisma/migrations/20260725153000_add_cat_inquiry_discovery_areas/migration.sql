-- Durable storage for inquiry discovery pipeline (Event Basics + other areas).
CREATE TABLE IF NOT EXISTS "cat_inquiry_discovery_areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "inquiry_id" UUID NOT NULL,
    "area_key" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL,
    "question" VARCHAR(500) NOT NULL,
    "lifecycle" VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    "validation" VARCHAR(50) NOT NULL DEFAULT 'READY',
    "summary" TEXT NOT NULL DEFAULT '',
    "event_basics" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_inquiry_discovery_areas" PRIMARY KEY ("id"),
    CONSTRAINT "uq_cat_inquiry_discovery_areas_inquiry_area" UNIQUE ("inquiry_id", "area_key"),
    CONSTRAINT "fk_cat_inquiry_discovery_areas_inquiry"
        FOREIGN KEY ("inquiry_id") REFERENCES "cat_inquiries"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_inquiry_discovery_areas_tenant_inquiry"
    ON "cat_inquiry_discovery_areas" ("tenant_id", "inquiry_id");
