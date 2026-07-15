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
  
  // Fix it to point to Pickup Van (85ec0e08-7035-4206-9850-75d1100d86b0) instead of the entity ID
  await recordService.updateRecord(
    'b27c468b-b2eb-4744-a66e-1ae3e9f7aa9c', 
    manifest, 
    { TYPE: '85ec0e08-7035-4206-9850-75d1100d86b0' }, 
    ctx
  );
  console.log("Fixed corrupted data!");
}
main().finally(() => prisma.$disconnect());

