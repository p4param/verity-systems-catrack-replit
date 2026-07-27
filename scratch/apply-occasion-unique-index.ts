import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Applying Unique Index Safeguard on cat_occasion_types ---');

  // Clean up any duplicates before adding unique index
  await prisma.$executeRawUnsafe(`
    UPDATE cat_occasion_types
    SET is_deleted = true, deleted_at = NOW()
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY tenant_id,
                              LOWER(REGEXP_REPLACE(TRIM(name), '\\s+', ' ', 'g'))
                 ORDER BY created_at ASC
               ) as rnum
        FROM cat_occasion_types
        WHERE is_deleted = false
      ) t
      WHERE t.rnum > 1
    );
  `);

  // Create unique index
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_cat_occasion_types_tenant_name"
    ON "cat_occasion_types" (
      "tenant_id",
      LOWER(REGEXP_REPLACE(TRIM("name"), '\\s+', ' ', 'g'))
    )
    WHERE "is_deleted" = false;
  `);

  console.log('Successfully created uq_cat_occasion_types_tenant_name index safeguard!');
}

main()
  .catch((e) => {
    console.error('Error creating unique index:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
