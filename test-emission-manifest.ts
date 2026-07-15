import { prisma } from './src/lib/prisma';
async function main() {
  const entity = await prisma.configurationEntity.findUnique({
    where: { id: '7ef861a1-8d80-45bc-a5e5-7545bd4a3a72' } // Vehicle entity
  });
  const manifest = (entity.metadata as any).runtimeManifest;
  
  const emissionField = manifest.fields.find(f => f.code.toLowerCase().includes('emission') || f.label.toLowerCase().includes('emission'));
  console.log(JSON.stringify(emissionField, null, 2));
}
main().finally(() => prisma.$disconnect());

