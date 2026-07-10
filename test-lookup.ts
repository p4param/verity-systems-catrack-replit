import { prisma } from './src/lib/prisma';
import { recordService } from './src/modules/platform/runtime/services/record-service';
async function main() {
  const entity = await prisma.configurationEntity.findUnique({
    where: { id: '94725201-7c44-4d3b-b2b4-5a8663c9b6ae' }
  });
  const manifest = entity.metadata.runtimeManifest;
  const records = await recordService.getRecords(entity.id, manifest, { skip: 0, take: 5 });
  console.log("Records:", records);
}
main().finally(() => prisma.$disconnect());
