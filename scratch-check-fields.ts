import { PrismaClient } from "./src/generated/client";

const prisma = new PrismaClient();

async function main() {
  const entity = await prisma.configurationEntity.findFirst({
    where: { code: 'Vehicle' },
    include: {
      fields: true
    }
  });

  console.log("Entity Fields:");
  console.log(JSON.stringify(entity?.fields, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
