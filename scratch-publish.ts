import { manifestGeneratorService } from "./src/modules/platform/runtime/services/manifest-generator";
import { PrismaClient } from "./src/generated/client";

const prisma = new PrismaClient();

async function main() {
  const entity = await prisma.configurationEntity.findFirst({
    where: { code: { equals: 'Vehicle', mode: 'insensitive' } }
  });
  
  if (entity) {
    const manifest = await manifestGeneratorService.generateManifest(entity.id);
    console.log("Regenerated manifest for Vehicle:", manifest);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
