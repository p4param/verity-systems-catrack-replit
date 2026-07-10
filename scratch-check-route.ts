import { PrismaClient } from "./src/generated/client";

const prisma = new PrismaClient();

async function main() {
  const entity = await prisma.configurationEntity.findUnique({
    where: { code: 'VEHICLE_TYPE' }
  });
  console.log("Route for VEHICLE_TYPE:", entity?.route);
  
  const navItem = await prisma.navigationItem.findFirst({
    where: { entityId: entity?.id }
  });
  console.log("Nav Item Route:", navItem?.route);
}

main().catch(console.error).finally(() => prisma.$disconnect());
