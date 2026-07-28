import { prisma } from "../src/lib/prisma";

// Adds NavigationItems for the admin sub-pages (audit, permissions, roles,
// security, users) under the existing ADMIN group. Also restores the
// "Dashboard" item's route, which had drifted to /admin/users at some point
// (unrelated background activity - see conversation), back to /admin/dashboard.

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@verity.com" } });
  if (!admin) throw new Error("Admin user (admin@verity.com) not found");

  const adminGroup = await prisma.navigationGroup.findUnique({ where: { code: "ADMIN" } });
  if (!adminGroup) throw new Error('NavigationGroup "ADMIN" not found');

  // Restore the Dashboard item's route
  const dashboardItem = await prisma.navigationItem.findFirst({ where: { navigationGroupId: adminGroup.id, title: "Dashboard" } });
  if (dashboardItem && dashboardItem.route !== "/admin/dashboard") {
    await prisma.navigationItem.update({
      where: { id: dashboardItem.id },
      data: { route: "/admin/dashboard", updatedBy: admin.id },
    });
    console.log(`+ Restored Dashboard route -> /admin/dashboard (was ${dashboardItem.route})`);
  }

  const targets = [
    { title: "Users", route: "/admin/users", icon: "Users", displayOrder: 10 },
    { title: "Roles", route: "/admin/roles", icon: "UserCog", displayOrder: 20 },
    { title: "Permissions", route: "/admin/permissions", icon: "Lock", displayOrder: 30 },
    { title: "Security", route: "/admin/security", icon: "Shield", displayOrder: 40 },
    { title: "Audit Log", route: "/admin/audit", icon: "History", displayOrder: 50 },
  ];

  for (const t of targets) {
    const existing = await prisma.navigationItem.findFirst({ where: { route: t.route } });
    if (existing) {
      await prisma.navigationItem.update({
        where: { id: existing.id },
        data: {
          navigationGroupId: adminGroup.id,
          title: t.title,
          icon: t.icon,
          displayOrder: t.displayOrder,
          visible: true,
          updatedBy: admin.id,
        },
      });
      console.log(`+ Updated NavigationItem ${t.route} -> Admin / ${t.icon}`);
    } else {
      await prisma.navigationItem.create({
        data: {
          navigationGroupId: adminGroup.id,
          title: t.title,
          route: t.route,
          icon: t.icon,
          displayOrder: t.displayOrder,
          menuType: "ROUTE",
          visible: true,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
      });
      console.log(`+ Created NavigationItem ${t.route} -> Admin / ${t.icon}`);
    }
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
