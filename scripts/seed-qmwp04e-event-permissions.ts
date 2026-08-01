import { prisma } from "../src/lib/prisma";

// QM-WP04E: registers CAT_EVENT_* permissions, matching the existing
// CAT_QUOTATION_*/CAT_RELATIONSHIP_* convention, and grants them to the
// ADMIN role. Note: requirePermission() already bypasses these checks
// entirely for the ADMIN role (see src/lib/auth/permission-guard.ts); this
// script exists so the permission model is genuinely correct for any
// future non-admin role, not just to unblock the admin account.

const PERMISSIONS = [
  { code: "CAT_EVENT_VIEW", description: "View Events" },
  { code: "CAT_EVENT_CREATE", description: "Create Events (including converting a Quotation to an Event)" },
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
