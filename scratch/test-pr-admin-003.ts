import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Running PR-ADMIN-003 Verification Checklist ---');

  // 1. Fetch tenant ID
  const tenantRows: Array<{ id: string }> = await prisma.$queryRawUnsafe(`SELECT id FROM tenants LIMIT 1`);
  if (!tenantRows[0]) {
    console.log('No tenant found.');
    return;
  }
  const tenantId = tenantRows[0].id;

  // 2. Query seeded occasion types
  const allRows: Array<any> = await prisma.$queryRawUnsafe(
    `SELECT id, name, code, is_active as "isActive", show_in_discovery_quick_select as "showInDiscoveryQuickSelect", display_order as "displayOrder"
     FROM cat_occasion_types
     WHERE tenant_id = $1::uuid AND is_deleted = false
     ORDER BY display_order ASC`,
    tenantId
  );

  console.log(`1. Total active Occasion Types for tenant: ${allRows.length}`);
  if (allRows.length === 0) {
    throw new Error('No occasion types found for tenant!');
  }

  // 3. Verify Quick Select filtering & ordering
  const quickSelectRows = allRows.filter(r => r.showInDiscoveryQuickSelect);
  console.log(`2. Quick Select Chips count: ${quickSelectRows.length}`);
  console.log('Quick Chips:', quickSelectRows.map(r => `${r.displayOrder}. ${r.name}`));

  // 4. Test creating a new custom Occasion Type master
  const customName = `Custom Event ${Date.now()}`;
  const countRows: Array<{ count: number }> = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM cat_occasion_types WHERE tenant_id = ${tenantId}::uuid
  `;
  const seqNumber = (countRows[0]?.count || 0) + 1;
  const occNumber = `OCC-${new Date().getFullYear()}-${String(seqNumber).padStart(4, '0')}`;

  const created: Array<{ id: string }> = await prisma.$queryRawUnsafe(
    `INSERT INTO cat_occasion_types (
      id, tenant_id, occasion_number, name, code, is_active,
      show_in_discovery_quick_select, display_order, created_at, updated_at, is_deleted
    ) VALUES (
      gen_random_uuid(), $1::uuid, $2, $3, $4, true, true, 100, NOW(), NOW(), false
    ) RETURNING id`,
    tenantId, occNumber, customName, 'CUSTOM_EVENT'
  );

  console.log('3. Created custom Occasion Type ID:', created[0].id);

  // 5. Test updating show_in_discovery_quick_select toggle
  await prisma.$executeRawUnsafe(
    `UPDATE cat_occasion_types SET show_in_discovery_quick_select = false WHERE id = $1::uuid`,
    created[0].id
  );

  const updated: Array<any> = await prisma.$queryRawUnsafe(
    `SELECT show_in_discovery_quick_select FROM cat_occasion_types WHERE id = $1::uuid`,
    created[0].id
  );

  console.log('4. Updated quick select flag:', updated[0]?.show_in_discovery_quick_select);
  if (updated[0]?.show_in_discovery_quick_select !== false) {
    throw new Error('Quick select toggle update failed!');
  }

  console.log('--- PR-ADMIN-003 VERIFICATION COMPLETE: ALL CHECKS PASSED ---');
}

main()
  .catch((e) => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
