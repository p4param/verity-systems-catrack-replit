import { prisma } from "../src/lib/prisma";

// PM-WP03B: registers CAT_PURCHASE_ORDER_VIEW/CREATE/EDIT, matching the
// exact three-permission baseline Quotation uses (CAT_QUOTATION_VIEW/
// CREATE/EDIT), and grants them to the ADMIN role. requirePermission()
// already bypasses these checks for ADMIN (see
// src/lib/auth/permission-guard.ts); this script exists so the
// permission model is genuinely correct for any future non-admin role.
// No dedicated per-transition permission (Approve/Issue/Cancel) — same
// as Quotation's /publish and Event's /convert, both of which ride on
// the entity's own EDIT rather than minting a distinct approver
// permission. That is a Workflow Engine concern, explicitly out of scope.

const PERMISSIONS = [
  { code: "CAT_PURCHASE_ORDER_VIEW", description: "View Purchase Orders" },
  { code: "CAT_PURCHASE_ORDER_CREATE", description: "Create Purchase Orders from Purchase Planning or manually" },
  { code: "CAT_PURCHASE_ORDER_EDIT", description: "Edit Purchase Order items and manage its lifecycle (Approve, Issue, Cancel)" },
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
