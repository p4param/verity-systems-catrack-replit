import { prisma } from './src/lib/prisma';

async function main() {
  const artifact = await prisma.runtimeArtifact.findFirst({
    where: {
      entity: { code: 'status', module: { code: 'reference' } },
      status: 'ACTIVE'
    }
  });
  
  if (!artifact) {
    console.log("No active artifact found for STATUS");
    return;
  }
  
  const payload = artifact.payload as any;
  const colorField = payload.fields?.find((f: any) => f.code === 'color' || f.code === 'COLOR');
  console.log("Color field:", JSON.stringify(colorField, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
