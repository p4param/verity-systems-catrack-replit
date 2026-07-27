-- APP-ADMIN-002: track how a cat_venues row was created (manual vs. auto-provisioned from Discovery)
ALTER TABLE "cat_venues"
    ADD COLUMN IF NOT EXISTS "creation_source" VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN IF NOT EXISTS "created_from_module" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "created_from_record_id" UUID,
    ADD COLUMN IF NOT EXISTS "created_from_record_number" VARCHAR(50);
