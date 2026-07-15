import { prisma } from './src/lib/prisma';
async function main() {
  const entity = await prisma.configurationEntity.findUnique({
    where: { id: '7ef861a1-8d80-45bc-a5e5-7545bd4a3a72' }
  });
  const manifest = (entity.metadata as any).runtimeManifest;
  console.log(JSON.stringify(manifest.fields.map(f => f.code), null, 2));
}
main().finally(() => prisma.$disconnect());

