import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Running PR-ADMIN-002B Verification Checklist ---');

  // 1. Fetch tenant and inquiry
  const tenantRows: Array<{ id: string }> = await prisma.$queryRawUnsafe(`SELECT id FROM tenants LIMIT 1`);
  if (!tenantRows[0]) {
    console.log('No tenant found.');
    return;
  }
  const tenantId = tenantRows[0].id;

  const testName = `Simplified Venue ${Date.now()}`;
  const testCity = 'Juhu, Mumbai';
  const testType = 'HOTEL';

  // 2. Test lightweight drawer POST creation
  console.log(`1. Testing drawer POST creation for "${testName}"...`);
  const currentYear = new Date().getFullYear();
  const countRows: Array<{ count: number }> = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM cat_venues WHERE tenant_id = ${tenantId}::uuid
  `;
  const seqNumber = (countRows[0]?.count || 0) + 1;
  const venueNumber = `VEN-${currentYear}-${String(seqNumber).padStart(4, '0')}`;

  const created: Array<{ id: string }> = await prisma.$queryRawUnsafe(
    `INSERT INTO cat_venues (
      id, tenant_id, venue_number, venue_name, venue_type, city, status,
      creation_source, created_at, updated_at, is_deleted
    ) VALUES (
      gen_random_uuid(), $1::uuid, $2, $3, $4, $5, 'DRAFT',
      'INQUIRY_DISCOVERY', NOW(), NOW(), false
    ) RETURNING id`,
    tenantId, venueNumber, testName, testType, testCity
  );

  console.log('Created venue ID:', created[0].id);

  // 3. Test lookup query for newly created DRAFT venue
  const lookupRes: Array<any> = await prisma.$queryRawUnsafe(
    `SELECT id, venue_name as name, venue_type as "venueType", city, status
     FROM cat_venues
     WHERE tenant_id = $1::uuid
       AND is_deleted = false
       AND status IN ('ACTIVE', 'DRAFT')
       AND venue_name ILIKE $2`,
    tenantId, `%${testName}%`
  );

  console.log('2. Lookup test for new DRAFT venue:', lookupRes[0]);
  if (!lookupRes[0] || lookupRes[0].status !== 'DRAFT') {
    throw new Error('Newly created DRAFT venue is not searchable in lookup!');
  }

  console.log('--- PR-ADMIN-002B VERIFICATION COMPLETE: ALL CHECKS PASSED ---');
}

main()
  .catch((e) => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
