import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Running PR-ADMIN-003 Refinements Verification Checklist ---');

  // 1. Fetch tenant ID
  const tenantRows: Array<{ id: string }> = await prisma.$queryRawUnsafe(`SELECT id FROM tenants LIMIT 1`);
  if (!tenantRows[0]) {
    console.log('No tenant found.');
    return;
  }
  const tenantId = tenantRows[0].id;

  const testName1 = `  Destination   Wedding ${Date.now()} `;
  const testName2 = testName1.toLowerCase().replace(/\s+/g, ' ');

  console.log('1. Testing Organic Master Growth & Duplicate Prevention for:', { testName1, testName2 });

  // Create first record (Organic Master Growth defaults: show_in_discovery_quick_select = false)
  const countRows: Array<{ count: number }> = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM cat_occasion_types WHERE tenant_id = ${tenantId}::uuid
  `;
  const seqNumber = (countRows[0]?.count || 0) + 1;
  const occNumber = `OCC-${new Date().getFullYear()}-${String(seqNumber).padStart(4, '0')}`;

  const created1: Array<{ id: string }> = await prisma.$queryRawUnsafe(
    `INSERT INTO cat_occasion_types (
      id, tenant_id, occasion_number, name, code, is_active,
      show_in_discovery_quick_select, display_order, created_at, updated_at, is_deleted
    ) VALUES (
      gen_random_uuid(), $1::uuid, $2, $3, $4, true, false, 99, NOW(), NOW(), false
    ) RETURNING id`,
    tenantId, occNumber, testName1, 'DESTINATION_WEDDING'
  );
  const firstId = created1[0].id;
  console.log('Initial Event Occasion master created ID:', firstId);

  // Perform normalized lookup test
  const normName = testName2.trim().replace(/\s+/g, ' ').toLowerCase();

  const matches: Array<{ id: string }> = await prisma.$queryRawUnsafe(
    `SELECT id
     FROM cat_occasion_types
     WHERE tenant_id = $1::uuid
       AND is_deleted = false
       AND LOWER(REGEXP_REPLACE(TRIM(name), '\\s+', ' ', 'g')) = $2
     LIMIT 1`,
    tenantId, normName
  );

  console.log('2. Normalized lookup matched existing Event Occasion ID:', matches[0]?.id);
  if (!matches[0] || matches[0].id !== firstId) {
    throw new Error('Normalized duplicate lookup failed to match existing Event Occasion!');
  }

  // Verify unique index exists in PostgreSQL
  const indexRows: Array<{ indexname: string }> = await prisma.$queryRawUnsafe(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'cat_occasion_types' 
      AND indexname = 'uq_cat_occasion_types_tenant_name'
  `);

  console.log('3. Unique index safeguard check:', indexRows.map(r => r.indexname));
  if (indexRows.length === 0) {
    throw new Error('Database unique index safeguard uq_cat_occasion_types_tenant_name is missing!');
  }

  console.log('--- PR-ADMIN-003 REFINEMENTS VERIFICATION COMPLETE: ALL CHECKS PASSED ---');
}

main()
  .catch((e) => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
