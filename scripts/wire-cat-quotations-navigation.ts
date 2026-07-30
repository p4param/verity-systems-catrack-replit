import { prisma } from "../src/lib/prisma";

// QM-WP01 — wires the Quotations NavigationItem into the Sales group,
// pointing at the real hand-built /cat/quotations route.
//
// Run this AFTER scripts/seed-qmwp01-quotation-metadata.ts. publishEntity()
// upserts its own NavigationItem pointed at the generic /runtime/cat/... path
// (see docs on this exact gotcha discovered while wiring Inquiry/Relationship
// navigation) — this script runs last so the final state points at the real
// page, matching the established pattern for every other CAT entity.

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@verity.com" } });
  if (!admin) throw new Error('Admin user (admin@verity.com) not found');

  const salesGroup = await prisma.navigationGroup.upsert({
    where: { code: "SALES" },
    update: {},
    create: {
      code: "SALES",
      name: "Sales",
      icon: "DollarSign",
      displayOrder: 1,
      isVisible: true,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  const entity = await prisma.configurationEntity.findUnique({ where: { code: "CatQuotation" } });
  if (!entity) throw new Error('ConfigurationEntity "CatQuotation" not found — run scripts/seed-qmwp01-quotation-metadata.ts first.');

  const target = { title: "Quotations", route: "/cat/quotations", icon: "DollarSign", displayOrder: 30 };

  const existing = await prisma.navigationItem.findFirst({ where: { entityId: entity.id } });

  if (existing) {
    await prisma.navigationItem.update({
      where: { id: existing.id },
      data: {
        navigationGroupId: salesGroup.id,
        title: target.title,
        route: target.route,
        icon: target.icon,
        displayOrder: target.displayOrder,
        visible: true,
        updatedBy: admin.id,
      },
    });
    console.log(`+ Updated NavigationItem for CatQuotation -> Sales / ${target.icon} / ${target.route}`);

    if (existing.platformModuleId) {
      await prisma.platformModule.update({
        where: { id: existing.platformModuleId },
        data: {
          name: target.title,
          icon: target.icon,
          navigationGroup: "Sales",
          updatedBy: admin.id,
        },
      });
      console.log(`  + Also updated linked PlatformModule ${existing.platformModuleId} -> name/icon/navigationGroup`);
    }
  } else {
    await prisma.navigationItem.create({
      data: {
        entityId: entity.id,
        navigationGroupId: salesGroup.id,
        title: target.title,
        route: target.route,
        icon: target.icon,
        displayOrder: target.displayOrder,
        visible: true,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
    console.log(`+ Created NavigationItem for CatQuotation -> Sales / ${target.icon} / ${target.route}`);
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
