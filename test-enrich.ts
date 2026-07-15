import { prisma } from './src/lib/prisma';
import { recordService } from './src/modules/platform/runtime/services/record-service';
async function main() {
  const entity = await prisma.configurationEntity.findUnique({
    where: { id: '7ef861a1-8d80-45bc-a5e5-7545bd4a3a72' } // Vehicle entity
  });
  const manifest = (entity.metadata as any).runtimeManifest;
  const records = await recordService.getRecords(entity.id, manifest, { skip: 0, take: 50 });
  
  console.log("Records:", records.map(r => ({ id: r.id, TYPE: r.TYPE, TYPE_label: r.TYPE_label })));
}
main().finally(() => prisma.$disconnect());

