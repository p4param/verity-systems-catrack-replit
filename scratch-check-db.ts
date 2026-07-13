import { prisma } from "./src/lib/prisma";

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

  if (!entity) return;

  for (const artifact of entity.artifacts) {
    console.log(`Version: ${artifact.version}, Status: ${artifact.status}, ID: ${artifact.id}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
