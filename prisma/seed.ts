/**
 * VS05Z Platform Seed
 *
 * Creates the minimum required data to boot the CAP platform after
 * a force-reset. All identifiers are UUID (gen_random_uuid()).
 *
 * Run: npx prisma db seed
 *   or: npx ts-node prisma/seed.ts
 */

import { PrismaClient } from "../src/generated/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 VS05Z Platform Seed starting...");

  // ── 1. Default Tenant ──────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { code: "VERITY" },
    update: {},
    create: {
      code: "VERITY",
      name: "Verity Systems",
      isActive: true,
    },
  });
  console.log(`✅ Tenant: ${tenant.name} [${tenant.id}]`);

  // ── 2. Default Permissions ─────────────────────────────────────────────────
  const permissionCodes = [
    "PLATFORM_ADMIN",
    "USER_READ",
    "USER_WRITE",
    "ROLE_READ",
    "ROLE_WRITE",
    "PERMISSION_READ",
    "PERMISSION_WRITE",
    "MODULE_READ",
    "MODULE_WRITE",
    "ENTITY_READ",
    "ENTITY_WRITE",
    "RECORD_READ",
    "RECORD_WRITE",
    "RECORD_DELETE",
    "AUDIT_READ",
    "SETTINGS_READ",
    "SETTINGS_WRITE",
    "PLATFORM_MODULE_VIEW",
    "PLATFORM_MODULE_CREATE",
    "PLATFORM_MODULE_UPDATE",
    "PLATFORM_MODULE_DELETE",
    "PLATFORM_MODULE_ACTIVATE",
    "PLATFORM_MODULE_DEACTIVATE",
    "PLATFORM_MODULE_REORDER",
    "PLATFORM_MODULE_CLONE",
    "PLATFORM_ENTITY_VIEW",
    "PLATFORM_ENTITY_CREATE",
    "PLATFORM_ENTITY_EDIT",
    "PLATFORM_ENTITY_DELETE",
    "PLATFORM_ENTITY_ARCHIVE",
    "PLATFORM_ENTITY_RESTORE",
    "PLATFORM_ENTITY_DUPLICATE",
    "PLATFORM_ENTITY_PUBLISH",
    "PLATFORM_FIELD_VIEW",
    "PLATFORM_FIELD_CREATE",
    "PLATFORM_FIELD_EDIT",
    "PLATFORM_FIELD_DELETE",
    "PLATFORM_FIELD_ARCHIVE",
    "PLATFORM_FIELD_PUBLISH",
    "PLATFORM_VIEW_VIEW",
    "PLATFORM_VIEW_CREATE",
    "PLATFORM_VIEW_EDIT",
    "PLATFORM_VIEW_DELETE",
  ];

  const permissions: Record<string, { id: string; code: string }> = {};
  for (const code of permissionCodes) {
    const perm = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code.replace(/_/g, " ") },
    });
    permissions[code] = perm;
  }
  console.log(`✅ Permissions: ${permissionCodes.length} created`);

  // ── 3. Default Roles ───────────────────────────────────────────────────────
  const superAdminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "SUPER_ADMIN" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "SUPER_ADMIN",
      description: "Full platform access",
      isSystem: true,
      isActive: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "ADMIN" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "ADMIN",
      description: "Administrative access",
      isSystem: true,
      isActive: true,
    },
  });

  const userRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "USER" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "USER",
      description: "Standard user access",
      isSystem: true,
      isActive: true,
    },
  });
  console.log(`✅ Roles: SUPER_ADMIN, ADMIN, USER`);

  // ── 4. Role-Permission Assignments ────────────────────────────────────────
  // SUPER_ADMIN gets ALL permissions
  for (const perm of Object.values(permissions)) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: perm.id },
    });
  }

  // ADMIN gets read/write but not PERMISSION_WRITE or PLATFORM_ADMIN
  const adminPermCodes = [
    "USER_READ", "USER_WRITE", "ROLE_READ",
    "MODULE_READ", "ENTITY_READ", "ENTITY_WRITE",
    "RECORD_READ", "RECORD_WRITE", "RECORD_DELETE",
    "AUDIT_READ", "SETTINGS_READ",
  ];
  for (const code of adminPermCodes) {
    if (permissions[code]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permissions[code].id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: permissions[code].id },
      });
    }
  }

  // USER gets read-only
  const userPermCodes = ["RECORD_READ", "ENTITY_READ", "MODULE_READ"];
  for (const code of userPermCodes) {
    if (permissions[code]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: userRole.id, permissionId: permissions[code].id } },
        update: {},
        create: { roleId: userRole.id, permissionId: permissions[code].id },
      });
    }
  }
  console.log(`✅ Role-Permission assignments created`);

  // ── 5. Admin User ──────────────────────────────────────────────────────────
  const adminPasswordHash = await bcrypt.hash("Admin@1234", 12);

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@verity.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      fullName: "Platform Administrator",
      email: "admin@verity.com",
      passwordHash: adminPasswordHash,
      status: "ACTIVE",
      isActive: true,
      isLocked: false,
      mfaEnabled: false,
      mfaSetupRequired: false,
    },
  });
  console.log(`✅ Admin User: ${adminUser.email} [${adminUser.id}]`);

  // ── 6. Assign ALL roles to admin user ─────────────────────────────────────
  const allRoles = [superAdminRole, adminRole, userRole];
  for (const role of allRoles) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: role.id } },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: role.id,
      },
    });
  }
  console.log(`✅ Admin user assigned all roles (SUPER_ADMIN, ADMIN, USER)`);

  // ── 7. Summary ─────────────────────────────────────────────────────────────
  console.log("\n🎉 VS05Z Seed complete.");
  console.log(`   Tenant:   ${tenant.code} (${tenant.id})`);
  console.log(`   Admin:    ${adminUser.email} / Admin@1234`);
  console.log(`   Roles:    SUPER_ADMIN, ADMIN, USER`);
  console.log(`   Perms:    ${permissionCodes.length}`);
  console.log("\n   ⚠️  Change the admin password on first login.\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
