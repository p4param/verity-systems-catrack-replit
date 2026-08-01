import { prisma } from "../src/lib/prisma";

// EM-WP01 — Event Foundation.
// Creates the "Operations" NavigationGroup and wires an "Events" item into
// it pointed at the real hand-built /cat/events directory page. CatEvent
// has no ConfigurationEntity/VAP-metadata row (Events are not created via
// the generic runtime — only via Quotation Conversion), so this item is a
// plain, hand-wired NavigationItem with no entityId, matching the pattern
// already established for Relationships/Inquiries/Quotations in
// scripts/wire-cat-sales-navigation.ts and
// scripts/wire-cat-quotations-navigation.ts. Both icons used here
// (ChefHat, Calendar) are already imported in src/components/ui/Sidebar.js's
// LucideIcons map — no Sidebar.js change required.

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

  const target = { title: "Events", route: "/cat/events", icon: "Calendar", displayOrder: 10 };

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
