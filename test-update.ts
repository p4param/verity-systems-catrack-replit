import { recordService } from './src/modules/platform/runtime/services/record-service';
import { prisma } from './src/lib/prisma';

async function main() {
  const entity = await prisma.configurationEntity.findUnique({
    where: { id: '7ef861a1-8d80-45bc-a5e5-7545bd4a3a72' }
  });
  const manifest = (entity.metadata as any).runtimeManifest;
  
  const ctx = {
    companyId: "00000000-0000-0000-0000-000000000001",
    branchId: "00000000-0000-0000-0000-000000000001",
    userId: `00000000-0000-0000-0000-000000000001`,
    tenantId: "system",
    actorUserId: "system",
  };

  const record = await recordService.updateRecord(
    'b27c468b-b2eb-4744-a66e-1ae3e9f7aa9c', 
    manifest, 
    { TYPE: '94725201-7c44-4d3b-b2b4-5a8663c9b6ae' }, 
    ctx
  );
  console.log(JSON.stringify(record, null, 2));
}

main().finally(() => prisma.$disconnect());

