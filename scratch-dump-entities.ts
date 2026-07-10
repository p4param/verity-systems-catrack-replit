import { PrismaClient } from "./src/generated/client";

const prisma = new PrismaClient();

async function main() {
  const entities = await prisma.configurationEntity.findMany({
    select: { id: true, code: true, name: true }
  });
  console.log("Entities:");
  console.table(entities);
}

main().catch(console.error).finally(() => prisma.$disconnect());
