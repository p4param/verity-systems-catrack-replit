import { prisma } from './src/lib/prisma';
import { recordService } from './src/modules/platform/runtime/services/record-service';
async function main() {
  const entityCode = '94725201-7c44-4d3b-b2b4-5a8663c9b6ae'; // vehicle-type
  const entity = await prisma.configurationEntity.findUnique({
    where: { id: entityCode }
  });
  const manifest = (entity.metadata as any).runtimeManifest;
  const records = await recordService.getRecords(entity.id, manifest, { skip: 0, take: 50 });
  
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

  const results = records.map((record: any) => ({
    id: record.id,
    label: record[displayFieldCode] || record.id
  }));
  
  console.log(JSON.stringify(results, null, 2));
}
main().finally(() => prisma.$disconnect());

