ALTER TABLE "cat_inquiry_discovery_areas"
ADD COLUMN IF NOT EXISTS "food_beverage" JSONB,
ADD COLUMN IF NOT EXISTS "budget_commercial" JSONB,
ADD COLUMN IF NOT EXISTS "decor_ambience" JSONB;
