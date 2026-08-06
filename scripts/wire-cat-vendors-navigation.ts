import { prisma } from "../src/lib/prisma";

// PM-WP01 — Vendor Master.
// Wires "Vendors" into the existing "Operations" NavigationGroup, pointed
// at the new /cat/vendors Directory. Same plain, hand-wired NavigationItem
// pattern as Events/Menu Templates/Menu Catalog/Ingredient Master/
// Production Center (no entityId — no ConfigurationEntity exists for
// Vendor either). "Truck" was already present in Sidebar.js's LucideIcons
// map (added for Logistics-adjacent use earlier) — no icon changes needed.

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@verity.com" } });
  if (!admin) throw new Error('Admin user (admin@verity.com) not found');

  const operationsGroup = await prisma.navigationGroup.upsert({
    where: { code: "OPERATIONS" },
    update: {},
    create: {
      code: "OPERATIONS",
      name: "Operations",
      icon: "ChefHat",
      displayOrder: 2,
      isVisible: true,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  const target = { title: "Vendors", route: "/cat/vendors", icon: "Truck", displayOrder: 60 };

  const existing = await prisma.navigationItem.findFirst({ where: { route: target.route } });

  if (existing) {
    await prisma.navigationItem.update({
      where: { id: existing.id },
      data: {
        navigationGroupId: operationsGroup.id,
        title: target.title,
        route: target.route,
        icon: target.icon,
        displayOrder: target.displayOrder,
        visible: true,
        updatedBy: admin.id,
      },
    });
    console.log(`+ Updated NavigationItem -> Operations / ${target.icon} / ${target.route}`);
  } else {
    await prisma.navigationItem.create({
      data: {
        navigationGroupId: operationsGroup.id,
        title: target.title,
        route: target.route,
        icon: target.icon,
        displayOrder: target.displayOrder,
        visible: true,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
    console.log(`+ Created NavigationItem -> Operations / ${target.icon} / ${target.route}`);
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
