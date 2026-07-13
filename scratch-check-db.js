const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const entity = await prisma.configurationEntity.findFirst({
    where: {
      code: { equals: "STATUS", mode: "insensitive" },
      module: { code: { equals: "REFERENCE", mode: "insensitive" } }
    },
    include: {
      artifacts: true,
      module: true
    }
  });

  if (!entity) {
    console.log("Entity 'STATUS' in module 'REFERENCE' not found.");
    
    // Check all entities in reference module
    const allRef = await prisma.configurationEntity.findMany({
      where: { module: { code: { equals: "REFERENCE", mode: "insensitive" } } },
      include: { module: true }
    });
    console.log("Entities in REFERENCE module:", allRef.map(e => e.code));

    // Check all modules
    const allMods = await prisma.platformModule.findMany();
    console.log("All modules:", allMods.map(m => m.code));

    process.exit(1);
  }

  console.log("Entity:", entity.code, "Module:", entity.module.code);
  console.log("Artifacts found:", entity.artifacts.length);
  if (entity.artifacts.length > 0) {
    console.log("Latest artifact status:", entity.artifacts[0].status, "Version:", entity.artifacts[0].version);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
