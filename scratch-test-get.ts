import { PrismaClient } from "./src/generated/client";
import { recordService } from "./src/modules/platform/runtime/services/record-service";

const prisma = new PrismaClient();

async function main() {
  const entityCode = "vehicle";
  const entity = await prisma.configurationEntity.findFirst({
    where: { code: { equals: entityCode, mode: 'insensitive' } },
  });

  if (!entity || !entity.metadata) {
    console.log("No entity or metadata");
    return;
  }

  const manifest = (entity.metadata as Record<string, any>).runtimeManifest;
  if (!manifest) {
    console.log("No manifest");
    return;
  }
  
  console.log("Found manifest:", manifest.entity);

  try {
    const records = await recordService.getRecords(entity.id, manifest, { skip: 0, take: 50 });
    console.log("Records:", records);
  } catch (err) {
    console.error("Error in getRecords:", err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
