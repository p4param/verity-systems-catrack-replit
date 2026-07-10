import { PrismaClient } from "./src/generated/client";

const prisma = new PrismaClient();

async function main() {
  const entity = await prisma.configurationEntity.findUnique({
    where: { code: 'VEHICLE_TYPE' }
  });
  console.log("Metadata:", JSON.stringify(entity?.metadata, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
