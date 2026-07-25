import { prisma } from "../src/lib/prisma";

async function checkEntityCounts() {
  try {
    const entities = await prisma.configurationEntity.findMany({
      where: { code: { in: ["CatRelationship", "CatContact"] } },
      include: {
        fields: true,
        views: true,
        layoutViews: true,
      },
    });

    console.log("=== Entity Metadata Counts ===");
    for (const ent of entities) {
      console.log(`Entity: ${ent.code} (${ent.name}) [ID: ${ent.id}]`);
      console.log(`- Fields count: ${ent.fields.length}`);
      console.log(`- Data Views count: ${ent.views.length}`);
      console.log(`- Layout Views count: ${ent.layoutViews.length}`);
    }
  } catch (err) {
    console.error("Error checking entity counts:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkEntityCounts();
