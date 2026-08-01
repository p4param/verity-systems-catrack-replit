import { prisma } from "../src/lib/prisma";

// EM-WP02: registers CAT_EVENT_EDIT, matching the existing CAT_EVENT_VIEW/
// CAT_EVENT_CREATE convention from QM-WP04E, and grants it to the ADMIN
// role. requirePermission() already bypasses these checks for ADMIN (see
// src/lib/auth/permission-guard.ts); this script exists so the permission
// model is genuinely correct for any future non-admin role.

const PERMISSIONS = [{ code: "CAT_EVENT_EDIT", description: "Edit Event Planning" }];

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
