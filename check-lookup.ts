import { PrismaClient } from '@prisma/client';
import { manifestGeneratorService } from './src/modules/platform/runtime/services/manifest-generator';
import { recordService } from './src/modules/platform/runtime/services/record-service';

const prisma = new PrismaClient();

async function main() {
  const vType = await prisma.configurationEntity.findFirst({where: {code: 'vehicletype'}});
  if (!vType) return console.log('Vehicle Type not found');

  const manifest = vType.metadata.runtimeManifest;
  console.log('Manifest:', JSON.stringify(manifest, null, 2));

  const records = await recordService.getRecords(vType.id, manifest, { skip: 0, take: 50 });
  console.log('Records:', records);
}

main().catch(console.error).finally(() => prisma.$disconnect());
