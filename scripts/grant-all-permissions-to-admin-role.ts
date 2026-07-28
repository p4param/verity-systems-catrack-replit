import { prisma } from "../src/lib/prisma";

// admin@verity.com holds the sole "ADMIN" role in this tenant, but that role was
// only ever assigned 18 of the 61 permissions that exist in the system - missing
// most PLATFORM_* permissions, which is why platform-module-gated nav items (e.g.
// the Admin group) were being filtered out of the sidebar for this account.
// This grants every existing Permission row to the ADMIN role.

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@verity.com" } });
  if (!admin) throw new Error("Admin user (admin@verity.com) not found");

  const role = await prisma.role.findFirst({ where: { name: "ADMIN" } });
  if (!role) throw new Error('Role "ADMIN" not found');

  const allPermissions = await prisma.permission.findMany();
  const existing = await prisma.rolePermission.findMany({ where: { roleId: role.id } });
  const existingIds = new Set(existing.map((rp) => rp.permissionId));

  const toGrant = allPermissions.filter((p) => !existingIds.has(p.id));

  if (toGrant.length === 0) {
    console.log("ADMIN role already has all permissions.");
    return;
  }

  await prisma.rolePermission.createMany({
    data: toGrant.map((p) => ({ roleId: role.id, permissionId: p.id })),
  });

  console.log(`Granted ${toGrant.length} missing permissions to ADMIN role:`);
  toGrant.forEach((p) => console.log(`  + ${p.code}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
