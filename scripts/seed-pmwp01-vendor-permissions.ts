import { prisma } from "../src/lib/prisma";

// PM-WP01: registers CAT_VENDOR_VIEW/EDIT, matching the existing
// CAT_INGREDIENT_MASTER_*/CAT_EVENT_* convention, and grants them to the
// ADMIN role. requirePermission() already bypasses these checks for ADMIN
// (see src/lib/auth/permission-guard.ts); this script exists so the
// permission model is genuinely correct for any future non-admin role.

const PERMISSIONS = [
  { code: "CAT_VENDOR_VIEW", description: "View Vendors" },
  { code: "CAT_VENDOR_EDIT", description: "Create and Edit Vendors, including their Supply Portfolio" },
];

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
