-- Formalizes cat_occasion_types, cat_cuisines, cat_service_styles: these tables were
-- previously created ad hoc via scratch/apply-occasion-types-schema.ts,
-- scratch/apply-occasion-unique-index.ts and scratch/apply-fb-schema.ts and were never
-- part of a tracked migration. This migration reproduces that DDL so a clean environment
-- ends up with the same schema as the current dev database. Seed data is intentionally
-- not included here; it belongs in the app's seed scripts.

-- cat_occasion_types
CREATE TABLE IF NOT EXISTS "cat_occasion_types" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "occasion_number" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "show_in_discovery_quick_select" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "idx_cat_occasion_types_tenant"
    ON "cat_occasion_types" ("tenant_id", "is_deleted", "is_active", "display_order");

-- Soft-delete pre-existing duplicate names so the unique index below can be created cleanly.
UPDATE cat_occasion_types
SET is_deleted = true, deleted_at = NOW()
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY tenant_id, LOWER(REGEXP_REPLACE(TRIM(name), '\s+', ' ', 'g'))
                   ORDER BY created_at ASC
               ) as rnum
        FROM cat_occasion_types
        WHERE is_deleted = false
    ) t
    WHERE t.rnum > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_cat_occasion_types_tenant_name"
    ON "cat_occasion_types" ("tenant_id", LOWER(REGEXP_REPLACE(TRIM("name"), '\s+', ' ', 'g')))
    WHERE "is_deleted" = false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'fk_cat_occasion_types_tenant'
      AND tc.table_name = 'cat_occasion_types'
  ) THEN
    ALTER TABLE "cat_occasion_types"
      ADD CONSTRAINT "fk_cat_occasion_types_tenant"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT;
  END IF;
END $$;

-- cat_cuisines
CREATE TABLE IF NOT EXISTS "cat_cuisines" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "cuisine_number" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "show_in_discovery_quick_select" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "idx_cat_cuisines_tenant"
    ON "cat_cuisines" ("tenant_id", "is_deleted", "is_active", "display_order");

UPDATE cat_cuisines
SET is_deleted = true, deleted_at = NOW()
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY tenant_id, LOWER(REGEXP_REPLACE(TRIM(name), '\s+', ' ', 'g'))
                   ORDER BY created_at ASC
               ) as rnum
        FROM cat_cuisines
        WHERE is_deleted = false
    ) t
    WHERE t.rnum > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_cat_cuisines_tenant_name"
    ON "cat_cuisines" ("tenant_id", LOWER(REGEXP_REPLACE(TRIM("name"), '\s+', ' ', 'g')))
    WHERE "is_deleted" = false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'fk_cat_cuisines_tenant'
      AND tc.table_name = 'cat_cuisines'
  ) THEN
    ALTER TABLE "cat_cuisines"
      ADD CONSTRAINT "fk_cat_cuisines_tenant"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT;
  END IF;
END $$;

-- cat_service_styles
CREATE TABLE IF NOT EXISTS "cat_service_styles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "style_number" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "show_in_discovery_quick_select" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "idx_cat_service_styles_tenant"
    ON "cat_service_styles" ("tenant_id", "is_deleted", "is_active", "display_order");

UPDATE cat_service_styles
SET is_deleted = true, deleted_at = NOW()
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY tenant_id, LOWER(REGEXP_REPLACE(TRIM(name), '\s+', ' ', 'g'))
                   ORDER BY created_at ASC
               ) as rnum
        FROM cat_service_styles
        WHERE is_deleted = false
    ) t
    WHERE t.rnum > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_cat_service_styles_tenant_name"
    ON "cat_service_styles" ("tenant_id", LOWER(REGEXP_REPLACE(TRIM("name"), '\s+', ' ', 'g')))
    WHERE "is_deleted" = false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'fk_cat_service_styles_tenant'
      AND tc.table_name = 'cat_service_styles'
  ) THEN
    ALTER TABLE "cat_service_styles"
      ADD CONSTRAINT "fk_cat_service_styles_tenant"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT;
  END IF;
END $$;
