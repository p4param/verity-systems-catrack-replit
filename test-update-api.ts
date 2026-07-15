import { prisma } from './src/lib/prisma';
import { recordService } from './src/modules/platform/runtime/services/record-service';
async function main() {
  const entity = await prisma.configurationEntity.findUnique({
    where: { id: '7ef861a1-8d80-45bc-a5e5-7545bd4a3a72' } // Vehicle entity
  });
  const manifest = (entity.metadata as any).runtimeManifest;
  
  const ctx = {
    companyId: "00000000-0000-0000-0000-000000000001",
    branchId: "00000000-0000-0000-0000-000000000001",
    userId: "00000000-0000-0000-0000-000000000000",
    tenantId: "system",
    actorUserId: "system",
  };
  
  // Try to update to EV Scooty (a212a848-3087-450d-9940-f02e49bf8be6)
  await recordService.updateRecord(
    'b27c468b-b2eb-4744-a66e-1ae3e9f7aa9c', 
    manifest, 
    { TYPE: 'a212a848-3087-450d-9940-f02e49bf8be6' }, 
    ctx
  );
  console.log("Updated to EV Scooty!");
  
  const record = await recordService.getRecordById('b27c468b-b2eb-4744-a66e-1ae3e9f7aa9c', manifest);
  console.log("New Record State:", record);
}
main().finally(() => prisma.$disconnect());

