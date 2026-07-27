import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Applying cat_occasion_types DB Schema & Seed Data ---');

  // 1. Create table
  await prisma.$executeRawUnsafe(`
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
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_cat_occasion_types_tenant" 
    ON "cat_occasion_types" ("tenant_id", "is_deleted", "is_active", "display_order");
  `);

  console.log('Table cat_occasion_types created or verified.');

  // 2. Fetch all tenants to seed default occasion types if empty
  const tenants: Array<{ id: string }> = await prisma.$queryRawUnsafe(`SELECT id FROM tenants`);

  const defaultOccasions = [
    { name: 'Wedding Reception', code: 'WEDDING_RECEPTION', quickSelect: true, order: 1 },
    { name: 'Sangeet / Mehendi', code: 'SANGEET_MEHENDI', quickSelect: true, order: 2 },
    { name: 'Ring Ceremony / Engagement', code: 'ENGAGEMENT', quickSelect: true, order: 3 },
    { name: 'Corporate Gala', code: 'CORPORATE_GALA', quickSelect: true, order: 4 },
    { name: 'Birthday Party', code: 'BIRTHDAY_PARTY', quickSelect: true, order: 5 },
    { name: 'Anniversary', code: 'ANNIVERSARY', quickSelect: true, order: 6 },
    { name: 'Cocktail Party', code: 'COCKTAIL_PARTY', quickSelect: true, order: 7 },
    { name: 'Cultural Celebration', code: 'CULTURAL_CELEBRATION', quickSelect: false, order: 8 },
    { name: 'Social Gathering', code: 'SOCIAL_GATHERING', quickSelect: false, order: 9 },
  ];

  for (const tenant of tenants) {
    const existing: Array<{ count: number }> = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM cat_occasion_types WHERE tenant_id = $1::uuid AND is_deleted = false`,
      tenant.id
    );

    if ((existing[0]?.count || 0) === 0) {
      console.log(`Seeding default occasion types for tenant ${tenant.id}...`);
      let seq = 1;
      for (const occ of defaultOccasions) {
        const occNum = `OCC-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
        await prisma.$queryRawUnsafe(
          `INSERT INTO cat_occasion_types (
            id, tenant_id, occasion_number, name, code, is_active,
            show_in_discovery_quick_select, display_order, created_at, updated_at, is_deleted
          ) VALUES (
            gen_random_uuid(), $1::uuid, $2, $3, $4, true, $5, $6, NOW(), NOW(), false
          )`,
          tenant.id, occNum, occ.name, occ.code, occ.quickSelect, occ.order
        );
        seq++;
      }
    }
  }

  console.log('--- Schema & Seed execution completed successfully! ---');
}

main()
  .catch((e) => {
    console.error('Error applying occasion types schema:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
