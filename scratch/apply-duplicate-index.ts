import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up existing duplicate rows in cat_venues before creating unique index...');

  // Soft delete older duplicates so unique index can be created cleanly
  await prisma.$executeRawUnsafe(`
    UPDATE cat_venues
    SET is_deleted = true, deleted_at = NOW()
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY tenant_id,
                              LOWER(REGEXP_REPLACE(TRIM(venue_name), '\\s+', ' ', 'g')),
                              venue_type,
                              LOWER(REGEXP_REPLACE(TRIM(COALESCE(city, '')), '\\s+', ' ', 'g'))
                 ORDER BY created_at ASC
               ) as rnum
        FROM cat_venues
        WHERE is_deleted = false
      ) t
      WHERE t.rnum > 1
    );
  `);

  console.log('Duplicates cleaned up! Creating unique index safeguard on cat_venues...');
  
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_cat_venues_tenant_name_type_city"
    ON "cat_venues" (
      "tenant_id",
      LOWER(REGEXP_REPLACE(TRIM("venue_name"), '\\s+', ' ', 'g')),
      "venue_type",
      LOWER(REGEXP_REPLACE(TRIM(COALESCE("city", '')), '\\s+', ' ', 'g'))
    )
    WHERE "is_deleted" = false;
  `);

  console.log('Successfully created uq_cat_venues_tenant_name_type_city index safeguard!');
}

main()
  .catch((e) => {
    console.error('Unique index creation error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
