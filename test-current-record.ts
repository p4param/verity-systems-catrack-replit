import { prisma } from './src/lib/prisma';
import { recordService } from './src/modules/platform/runtime/services/record-service';
async function main() {
  const entity = await prisma.configurationEntity.findUnique({
    where: { id: '7ef861a1-8d80-45bc-a5e5-7545bd4a3a72' } // Vehicle entity
  });
  const manifest = (entity.metadata as any).runtimeManifest;
  const record = await recordService.getRecordById('b27c468b-b2eb-4744-a66e-1ae3e9f7aa9c', manifest);
  
  console.log("Current Record:", record);
}
main().finally(() => prisma.$disconnect());

