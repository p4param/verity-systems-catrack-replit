import { prisma } from "../src/lib/prisma";

// One-time fix: CatRelationship and CatInquiry already have NavigationItem rows
// (created by bootstrap-cat-relationship-metadata.js / seed-im001-inquiry-metadata.ts),
// but a later VAP metadata publish overwrote their `route` with the generic
// auto-generated runtime view path (/runtime/...) instead of the real hand-built
// pages at /cat/relationships and /cat/inquiries. Neither row was ever assigned to
// a "Sales" group either (it doesn't exist yet in this DB) - the Sidebar component
// just hardcoded a fallback link for Relationships instead, and Inquiries had none.
// This creates the Sales group and repoints both items at their real pages with
// proper Lucide icons.

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@verity.com" } });
  if (!admin) throw new Error('Admin user (admin@verity.com) not found. Run "npx prisma db seed" first.');

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

  const targets = [
    { entityCode: "CatRelationship", title: "Relationships", route: "/cat/relationships", icon: "Handshake", displayOrder: 10 },
    { entityCode: "CatInquiry", title: "Inquiries", route: "/cat/inquiries", icon: "MessageSquare", displayOrder: 20 },
  ];

  for (const t of targets) {
    const entity = await prisma.configurationEntity.findUnique({ where: { code: t.entityCode } });
    if (!entity) {
      console.log(`~ Skipped ${t.entityCode}: ConfigurationEntity not found`);
      continue;
    }

    const existing = await prisma.navigationItem.findFirst({ where: { entityId: entity.id } });

    if (existing) {
      await prisma.navigationItem.update({
        where: { id: existing.id },
        data: {
          navigationGroupId: salesGroup.id,
          title: t.title,
          route: t.route,
          icon: t.icon,
          displayOrder: t.displayOrder,
          visible: true,
          updatedBy: admin.id,
        },
      });
      console.log(`+ Updated NavigationItem for ${t.entityCode} -> Sales / ${t.icon} / ${t.route}`);

      // NavigationService.generateTree() overrides title/route/icon from the linked
      // PlatformModule when navigationItem.platformModuleId is set - so if this item
      // is module-linked, the module's own fields (not the NavigationItem's) are what
      // actually render in the sidebar. Fix those too so the override doesn't undo us.
      if (existing.platformModuleId) {
        await prisma.platformModule.update({
          where: { id: existing.platformModuleId },
          data: {
            name: t.title,
            icon: t.icon,
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
          title: t.title,
          route: t.route,
          icon: t.icon,
          displayOrder: t.displayOrder,
          visible: true,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
      });
      console.log(`+ Created NavigationItem for ${t.entityCode} -> Sales / ${t.icon} / ${t.route}`);
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
