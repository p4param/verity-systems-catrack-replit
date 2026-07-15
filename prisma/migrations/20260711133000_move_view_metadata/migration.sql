/*
  Warnings:

  - You are about to drop the column `columns` on entity views table. All the data in the column will be lost.
  - You are about to drop the column `filters` on entity views table. All the data in the column will be lost.
  - You are about to drop the column `sorting` on entity views table. All the data in the column will be lost.

*/
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'entity_views'
  ) THEN
    ALTER TABLE "entity_views"
      DROP COLUMN IF EXISTS "columns",
      DROP COLUMN IF EXISTS "filters",
      DROP COLUMN IF EXISTS "sorting";
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'EntityView'
  ) THEN
    ALTER TABLE "EntityView"
      DROP COLUMN IF EXISTS "columns",
      DROP COLUMN IF EXISTS "filters",
      DROP COLUMN IF EXISTS "sorting";
  END IF;
END $$;
