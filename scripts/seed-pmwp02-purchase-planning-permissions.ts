import { prisma } from "../src/lib/prisma";

// PM-WP02: registers CAT_PURCHASE_PLANNING_VIEW, matching the existing
// CAT_VENDOR_*/CAT_EVENT_* convention, and grants it to the ADMIN role.
// requirePermission() already bypasses these checks for ADMIN (see
// src/lib/auth/permission-guard.ts); this script exists so the
// permission model is genuinely correct for any future non-admin role.
// No CAT_PURCHASE_PLANNING_EDIT — the workspace is read-only, there is
// nothing to gate a write permission against.

const PERMISSIONS = [{ code: "CAT_PURCHASE_PLANNING_VIEW", description: "View Purchase Planning recommendations" }];

async function main() {
  const role = await prisma.role.findFirst({ where: { name: "ADMIN" } });
  if (!role) throw new Error('Role "ADMIN" not found');

  for (const p of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: { code: p.code, description: p.description },
    });

    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });

    console.log(`+ Ensured permission ${p.code} and granted to ADMIN role`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
