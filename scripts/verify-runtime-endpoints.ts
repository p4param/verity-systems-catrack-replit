import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🔍 Verifying Published Metadata in Runtime Artifacts...\n");

  const entities = ["CatRelationship", "CatContact"];

  for (const code of entities) {
    const entity = await prisma.configurationEntity.findUnique({
      where: { code },
      include: { module: true }
    });

    if (!entity) {
      console.error(`❌ Entity ${code} not found`);
      continue;
    }

    console.log(`=== Entity: ${entity.code} (Status: ${entity.status}) ===`);
    console.log(`Module Code : ${entity.module.code}`);
    console.log(`Route       : ${entity.route}`);

    const artifact = await prisma.runtimeArtifact.findFirst({
      where: { entityId: entity.id, status: "ACTIVE" },
      orderBy: { version: "desc" }
    });

    if (!artifact) {
      console.error(`❌ No ACTIVE RuntimeArtifact found for ${code}`);
      continue;
    }

    const payload = artifact.payload as any;

    console.log(`✅ Active Artifact Version : v${artifact.version}`);
    console.log(`   Registered Fields Count : ${payload.fields?.length || 0}`);
    console.log(`   Data Views Count        : ${payload.presentation?.dataViews?.length || 0}`);
    console.log(`   Layout Views Count      : ${payload.presentation?.layoutViews?.length || 0}`);
    console.log(`   Permissions View        : ${payload.permissions?.view}`);
    console.log(`   Field Names             : ${payload.fields?.map((f: any) => f.code).join(", ")}\n`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
