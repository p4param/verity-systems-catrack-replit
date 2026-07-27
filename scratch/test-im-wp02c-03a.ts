import { PrismaClient } from '../src/generated/client';
import { computeFoodBeverageValidation } from '../src/modules/cat/inquiry/domain/discovery-types';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Running IM-WP02C-03A Food & Beverage Discovery Verification ---');

  // 1. Verify DB Tables & Seeded Masters
  const tenantRows: Array<{ id: string }> = await prisma.$queryRawUnsafe(`SELECT id FROM tenants LIMIT 1`);
  if (!tenantRows[0]) throw new Error('No tenant found!');
  const tenantId = tenantRows[0].id;

  const cuisines: Array<any> = await prisma.$queryRawUnsafe(
    `SELECT name, show_in_discovery_quick_select as "quickSelect" FROM cat_cuisines WHERE tenant_id = $1::uuid AND is_deleted = false ORDER BY display_order ASC`,
    tenantId
  );

  const styles: Array<any> = await prisma.$queryRawUnsafe(
    `SELECT name, show_in_discovery_quick_select as "quickSelect" FROM cat_service_styles WHERE tenant_id = $1::uuid AND is_deleted = false ORDER BY display_order ASC`,
    tenantId
  );

  console.log(`1. Cuisines seeded for tenant: ${cuisines.length}`);
  console.log('Sample Cuisines:', cuisines.slice(0, 3).map((c) => c.name));
  console.log(`2. Service Styles seeded for tenant: ${styles.length}`);
  console.log('Sample Styles:', styles.slice(0, 3).map((s) => s.name));

  if (cuisines.length === 0 || styles.length === 0) {
    throw new Error('Seeded cuisines or service styles missing!');
  }

  // 2. Test Organic Master Growth & Normalized Duplicate Lookup
  const testCuisine = `  Awadhi   Dum   Fusion ${Date.now()} `;
  const normName = testCuisine.trim().replace(/\s+/g, ' ').toLowerCase();

  const cNum = `CUI-${new Date().getFullYear()}-9999`;
  const inserted: Array<{ id: string }> = await prisma.$queryRawUnsafe(
    `INSERT INTO cat_cuisines (
      id, tenant_id, cuisine_number, name, code, is_active, show_in_discovery_quick_select, display_order, created_at, updated_at, is_deleted
    ) VALUES (
      gen_random_uuid(), $1::uuid, $2, $3, $4, true, false, 99, NOW(), NOW(), false
    ) RETURNING id`,
    tenantId, cNum, testCuisine, 'AWADHI_FUSION'
  );

  console.log('3. Organic Master Growth created Cuisine ID:', inserted[0].id);

  const match: Array<{ id: string }> = await prisma.$queryRawUnsafe(
    `SELECT id FROM cat_cuisines WHERE tenant_id = $1::uuid AND is_deleted = false AND LOWER(REGEXP_REPLACE(TRIM(name), '\\s+', ' ', 'g')) = $2 LIMIT 1`,
    tenantId, normName
  );

  console.log('4. Normalized duplicate lookup matched ID:', match[0]?.id);
  if (!match[0] || match[0].id !== inserted[0].id) {
    throw new Error('Normalized duplicate lookup failed!');
  }

  // 3. Test Domain Validation Logic
  const validStatus = computeFoodBeverageValidation({
    mealSchedule: ['LUNCH_AND_DINNER'],
    primaryCuisineName: 'North Indian Royal Mughlai',
    primaryServiceStyleName: 'Royal Buffet Setup',
    dietaryOptions: { pureVegetarian: false, nonVegetarianAllowed: true },
  });
  console.log('5. Domain Validation (Complete):', validStatus);
  if (validStatus !== 'READY') throw new Error('Complete model should be READY!');

  const incompleteStatus = computeFoodBeverageValidation({
    mealSchedule: [],
    primaryCuisineName: 'North Indian Royal Mughlai',
  });
  console.log('6. Domain Validation (Incomplete):', incompleteStatus);
  if (incompleteStatus !== 'NEEDS_ATTENTION') throw new Error('Incomplete model should be NEEDS_ATTENTION!');

  const blockedStatus = computeFoodBeverageValidation({
    mealSchedule: ['LUNCH'],
    primaryCuisineName: 'North Indian Royal Mughlai',
    primaryServiceStyleName: 'Royal Buffet Setup',
    dietaryOptions: { pureVegetarian: true, nonVegetarianAllowed: true },
  });
  console.log('7. Domain Validation (Conflict):', blockedStatus);
  if (blockedStatus !== 'BLOCKED') throw new Error('Conflicting model should be BLOCKED!');

  console.log('--- IM-WP02C-03A VERIFICATION COMPLETE: ALL CHECKS PASSED ---');
}

main()
  .catch((e) => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
