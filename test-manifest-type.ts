import { prisma } from './src/lib/prisma';
async function main() {
  const entity = await prisma.configurationEntity.findUnique({
    where: { id: '94725201-7c44-4d3b-b2b4-5a8663c9b6ae' } // ID of the VEHICLE_TYPE lookup entity
  });
  if (entity) {
    const manifest = entity.metadata.runtimeManifest;
    console.log("Fields:", manifest.fields.map(f => ({ code: f.code, label: f.label })));
  } else {
    console.log("Entity not found");
  }
}
main().finally(() => prisma.$disconnect());
