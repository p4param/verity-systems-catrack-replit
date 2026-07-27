import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Applying Cuisines & Service Styles DB Schema & Seed Data ---');

  // 1. Create cat_cuisines table
  await prisma.$executeRawUnsafe(`
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
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_cat_cuisines_tenant_name" 
    ON "cat_cuisines" ("tenant_id", LOWER(REGEXP_REPLACE(TRIM("name"), '\\s+', ' ', 'g')))
    WHERE "is_deleted" = false;
  `);

  // 2. Create cat_service_styles table
  await prisma.$executeRawUnsafe(`
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
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_cat_service_styles_tenant_name" 
    ON "cat_service_styles" ("tenant_id", LOWER(REGEXP_REPLACE(TRIM("name"), '\\s+', ' ', 'g')))
    WHERE "is_deleted" = false;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "cat_inquiry_discovery_areas"
    ADD COLUMN IF NOT EXISTS "food_beverage" JSONB;
  `);

  console.log('Tables cat_cuisines and cat_service_styles created or verified.');

  // 3. Seed default masters for all tenants
  const tenants: Array<{ id: string }> = await prisma.$queryRawUnsafe(`SELECT id FROM tenants`);

  const defaultCuisines = [
    { name: 'North Indian Royal Mughlai', code: 'NORTH_INDIAN_MUGHLAI', quickSelect: true, order: 1 },
    { name: 'Pan-Asian & Dim Sum', code: 'PAN_ASIAN', quickSelect: true, order: 2 },
    { name: 'Italian & Mediterranean', code: 'ITALIAN_MEDITERRANEAN', quickSelect: true, order: 3 },
    { name: 'Awadhi & Hyderabadi Dum', code: 'AWADHI_HYDERABADI', quickSelect: true, order: 4 },
    { name: 'Regional Coastal & South Indian', code: 'COASTAL_SOUTH_INDIAN', quickSelect: true, order: 5 },
    { name: 'Continental & European', code: 'CONTINENTAL', quickSelect: true, order: 6 },
    { name: 'Street Food & Chaat Specialities', code: 'STREET_FOOD_CHAAT', quickSelect: true, order: 7 },
    { name: 'Lebanese & Middle Eastern', code: 'MIDDLE_EASTERN', quickSelect: false, order: 8 },
    { name: 'Mexican & Tex-Mex Grill', code: 'MEXICAN', quickSelect: false, order: 9 },
  ];

  const defaultStyles = [
    { name: 'Royal Buffet Setup', code: 'ROYAL_BUFFET', quickSelect: true, order: 1 },
    { name: 'Pre-Plated Table Service', code: 'PLATED_SERVICE', quickSelect: true, order: 2 },
    { name: 'Interactive Live Cooking Counters', code: 'LIVE_COUNTERS', quickSelect: true, order: 3 },
    { name: 'Passed Canapés & Butler Service', code: 'PASSED_CANAPES', quickSelect: true, order: 4 },
    { name: 'Family Style Sharing Platter', code: 'FAMILY_STYLE', quickSelect: true, order: 5 },
    { name: 'High Tea Refreshments Counter', code: 'HIGH_TEA_COUNTER', quickSelect: false, order: 6 },
  ];

  for (const tenant of tenants) {
    // Seed Cuisines
    const existingCuisines: Array<{ count: number }> = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM cat_cuisines WHERE tenant_id = $1::uuid AND is_deleted = false`,
      tenant.id
    );
    if ((existingCuisines[0]?.count || 0) === 0) {
      console.log(`Seeding default cuisines for tenant ${tenant.id}...`);
      let seq = 1;
      for (const c of defaultCuisines) {
        const cNum = `CUI-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
        await prisma.$queryRawUnsafe(
          `INSERT INTO cat_cuisines (
            id, tenant_id, cuisine_number, name, code, is_active,
            show_in_discovery_quick_select, display_order, created_at, updated_at, is_deleted
          ) VALUES (
            gen_random_uuid(), $1::uuid, $2, $3, $4, true, $5, $6, NOW(), NOW(), false
          )`,
          tenant.id, cNum, c.name, c.code, c.quickSelect, c.order
        );
        seq++;
      }
    }

    // Seed Service Styles
    const existingStyles: Array<{ count: number }> = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM cat_service_styles WHERE tenant_id = $1::uuid AND is_deleted = false`,
      tenant.id
    );
    if ((existingStyles[0]?.count || 0) === 0) {
      console.log(`Seeding default service styles for tenant ${tenant.id}...`);
      let seq = 1;
      for (const s of defaultStyles) {
        const sNum = `STY-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
        await prisma.$queryRawUnsafe(
          `INSERT INTO cat_service_styles (
            id, tenant_id, style_number, name, code, is_active,
            show_in_discovery_quick_select, display_order, created_at, updated_at, is_deleted
          ) VALUES (
            gen_random_uuid(), $1::uuid, $2, $3, $4, true, $5, $6, NOW(), NOW(), false
          )`,
          tenant.id, sNum, s.name, s.code, s.quickSelect, s.order
        );
        seq++;
      }
    }
  }

  console.log('--- DB Schema & Seed execution completed successfully! ---');
}

main()
  .catch((e) => {
    console.error('Error applying F&B DB schema:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
