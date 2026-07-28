ALTER TABLE "cat_inquiry_discovery_areas"
ADD COLUMN IF NOT EXISTS "special_requirements" JSONB;
