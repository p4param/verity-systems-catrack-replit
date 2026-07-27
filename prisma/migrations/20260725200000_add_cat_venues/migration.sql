-- APP-ADMIN-002: CAT Venue Directory foundation
CREATE TABLE IF NOT EXISTS "cat_venues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "venue_number" VARCHAR(50) NOT NULL,
    "venue_name" VARCHAR(255) NOT NULL,
    "venue_type" VARCHAR(100) NOT NULL,
    "address" TEXT,
    "area_locality" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100),
    "pin_code" VARCHAR(20),
    "primary_contact_name" VARCHAR(255),
    "primary_contact_mobile" VARCHAR(50),
    "primary_contact_email" VARCHAR(255),
    "notes" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT "pk_cat_venues" PRIMARY KEY ("id"),
    CONSTRAINT "uq_cat_venues_tenant_number" UNIQUE ("tenant_id", "venue_number")
);

CREATE INDEX IF NOT EXISTS "idx_cat_venues_tenant_deleted"
    ON "cat_venues" ("tenant_id", "is_deleted");
CREATE INDEX IF NOT EXISTS "idx_cat_venues_tenant_status"
    ON "cat_venues" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_cat_venues_tenant_name"
    ON "cat_venues" ("tenant_id", "venue_name");
CREATE INDEX IF NOT EXISTS "idx_cat_venues_tenant_city"
    ON "cat_venues" ("tenant_id", "city");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'fk_cat_venues_tenant'
      AND tc.table_name = 'cat_venues'
  ) THEN
    ALTER TABLE "cat_venues"
      ADD CONSTRAINT "fk_cat_venues_tenant"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT;
  END IF;
END $$;
