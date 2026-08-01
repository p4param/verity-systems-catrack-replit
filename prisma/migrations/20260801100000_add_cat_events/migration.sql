-- QM-WP04E: Event Conversion.
-- Converts an Accepted, Published proposal revision into a new operational
-- Event — the Sales -> Operations handoff. A new, minimal cat_events table,
-- deliberately NOT the legacy catering_events/CateringEvent Prisma model
-- (a separate, incompatible schema: no cat_relationships/cat_quotations
-- linkage, ad-hoc event numbering, generic lookup-table-driven statuses).
-- Out of scope beyond the point of creation: Event Planning, Menu
-- Planning, Procurement, Kitchen, Billing, Contracts, Customer Portal,
-- Electronic Signatures — this table exists only to record that the
-- transition happened and what it produced.

CREATE TABLE IF NOT EXISTS "cat_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_number" VARCHAR(50) NOT NULL,
    "relationship_id" UUID NOT NULL,
    "origin_quotation_id" UUID NOT NULL,
    "origin_quotation_revision" INTEGER NOT NULL,
    "event_name" VARCHAR(255) NOT NULL,
    "event_type" VARCHAR(100),
    "event_date" DATE,
    "venue" VARCHAR(255),
    "guest_count" INTEGER,
    "grand_total" NUMERIC(14,2),
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(50) NOT NULL DEFAULT 'PLANNING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT "pk_cat_events" PRIMARY KEY ("id"),
    CONSTRAINT "uq_cat_events_tenant_number" UNIQUE ("tenant_id", "event_number"),
    CONSTRAINT "fk_cat_events_relationship"
        FOREIGN KEY ("relationship_id") REFERENCES "cat_relationships"("id") ON DELETE RESTRICT,
    CONSTRAINT "fk_cat_events_origin_quotation"
        FOREIGN KEY ("origin_quotation_id") REFERENCES "cat_quotations"("id") ON DELETE RESTRICT,
    CONSTRAINT "fk_cat_events_origin_publication"
        FOREIGN KEY ("origin_quotation_id", "origin_quotation_revision")
        REFERENCES "cat_quotation_publications"("quotation_id", "revision_number")
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_cat_events_tenant_deleted" ON "cat_events" ("tenant_id", "is_deleted");
CREATE INDEX IF NOT EXISTS "idx_cat_events_origin_quotation" ON "cat_events" ("origin_quotation_id");

-- Conversion tracking on the originating quotation. A quotation may only
-- be converted once — enforced at the application layer (a row-locked
-- check inside the single conversion transaction), and recorded here for
-- audit / duplicate-protection lookups.
ALTER TABLE "cat_quotations" ADD COLUMN IF NOT EXISTS "converted_event_id" UUID;
ALTER TABLE "cat_quotations" ADD COLUMN IF NOT EXISTS "converted_at" TIMESTAMPTZ;
ALTER TABLE "cat_quotations" ADD COLUMN IF NOT EXISTS "converted_by" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_cat_quotations_converted_event'
  ) THEN
    ALTER TABLE "cat_quotations"
      ADD CONSTRAINT "fk_cat_quotations_converted_event"
      FOREIGN KEY ("converted_event_id") REFERENCES "cat_events"("id") ON DELETE SET NULL;
  END IF;
END $$;
