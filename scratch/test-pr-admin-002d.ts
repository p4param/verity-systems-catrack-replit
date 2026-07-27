import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Running PR-ADMIN-002D Verification Checklist ---');

  // 1. Fetch tenant ID
  const tenantRows: Array<{ id: string }> = await prisma.$queryRawUnsafe(`SELECT id FROM tenants LIMIT 1`);
  if (!tenantRows[0]) {
    console.log('No tenant found.');
    return;
  }
  const tenantId = tenantRows[0].id;

  const testName1 = `  Grand   Orchid  Palace ${Date.now()} `;
  const testName2 = testName1.toLowerCase().replace(/\s+/g, ' ');
  const testCity1 = '  Bandra West, MUMBAI  ';
  const testCity2 = 'bandra west, mumbai';
  const testType = 'BANQUET_HALL';

  console.log('1. Testing normalized duplicate detection for:', { testName1, testName2 });

  // Create first record
  const currentYear = new Date().getFullYear();
  const countRows: Array<{ count: number }> = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM cat_venues WHERE tenant_id = ${tenantId}::uuid
  `;
  const seqNumber = (countRows[0]?.count || 0) + 1;
  const venueNumber = `VEN-${currentYear}-${String(seqNumber).padStart(4, '0')}`;

  const created1: Array<{ id: string }> = await prisma.$queryRawUnsafe(
    `INSERT INTO cat_venues (
      id, tenant_id, venue_number, venue_name, venue_type, city, status,
      creation_source, created_at, updated_at, is_deleted
    ) VALUES (
      gen_random_uuid(), $1::uuid, $2, $3, $4, $5, 'DRAFT',
      'INQUIRY_DISCOVERY', NOW(), NOW(), false
    ) RETURNING id`,
    tenantId, venueNumber, testName1, testType, testCity1
  );
  const firstId = created1[0].id;
  console.log('Initial venue master created ID:', firstId);

  // Perform normalized lookup test
  const normName = testName2.trim().replace(/\s+/g, ' ').toLowerCase();
  const normCity = testCity2.trim().replace(/\s+/g, ' ').toLowerCase();

  const matches: Array<{ id: string }> = await prisma.$queryRawUnsafe(
    `SELECT id
     FROM cat_venues
     WHERE tenant_id = $1::uuid
       AND is_deleted = false
       AND LOWER(REGEXP_REPLACE(TRIM(venue_name), '\\s+', ' ', 'g')) = $2
       AND venue_type = $3
       AND LOWER(REGEXP_REPLACE(TRIM(COALESCE(city, '')), '\\s+', ' ', 'g')) = $4
     LIMIT 1`,
    tenantId, normName, testType, normCity
  );

  console.log('2. Normalized lookup matched existing venue ID:', matches[0]?.id);
  if (!matches[0] || matches[0].id !== firstId) {
    throw new Error('Normalized duplicate lookup failed to match existing venue!');
  }

  // Verify unique index exists in PostgreSQL
  const indexRows: Array<{ indexname: string }> = await prisma.$queryRawUnsafe(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'cat_venues' 
      AND indexname = 'uq_cat_venues_tenant_name_type_city'
  `);

  console.log('3. Unique index safeguard check:', indexRows.map(r => r.indexname));
  if (indexRows.length === 0) {
    throw new Error('Database unique index safeguard uq_cat_venues_tenant_name_type_city is missing!');
  }

  console.log('--- PR-ADMIN-002D VERIFICATION COMPLETE: ALL CHECKS PASSED ---');
}

main()
  .catch((e) => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
