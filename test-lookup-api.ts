import { prisma } from './src/lib/prisma';
async function main() {
  const entity = await prisma.configurationEntity.findUnique({
    where: { id: '94725201-7c44-4d3b-b2b4-5a8663c9b6ae' }
  });
  const manifest = entity.metadata.runtimeManifest;
  let displayFieldCode = "id";
  const possibleFields = ["NAME", "TITLE", "CODE", "DESCRIPTION"];
  for (const f of possibleFields) {
    if (manifest.fields.find(mf => mf.code === f)) {
      displayFieldCode = f;
      break;
    }
  }
  
  if (displayFieldCode === "id") {
    const firstTextField = manifest.fields.find(f => f.dataType === "STRING");
    if (firstTextField) displayFieldCode = firstTextField.code;
  }
  console.log("Display Field Code for vehicle-type:", displayFieldCode);
}
main().finally(() => prisma.$disconnect());
