import { prisma } from './src/lib/prisma';
async function main() {
  const entity = await prisma.configurationEntity.findUnique({
    where: { id: '7ef861a1-8d80-45bc-a5e5-7545bd4a3a72' }
  });
  const manifest = (entity.metadata as any).runtimeManifest;
  const typeField = manifest.fields.find(f => f.code === 'TYPE');
  console.log(JSON.stringify(typeField, null, 2));
}
main().finally(() => prisma.$disconnect());

