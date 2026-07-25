import { publishService } from "../src/modules/platform/configuration/services/publish-service";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🚀 Explicitly triggering Publish Pipeline for CatRelationship & CatContact...");

  const adminUser = await prisma.user.findFirst({ where: { email: "admin@verity.com" } });
  const actorUserId = adminUser?.id || "system";

  const rel = await prisma.configurationEntity.findUnique({ where: { code: "CatRelationship" } });
  const contact = await prisma.configurationEntity.findUnique({ where: { code: "CatContact" } });

  if (rel) {
    console.log(`Publishing CatRelationship [${rel.id}]...`);
    const resRel = await publishService.publishEntity(rel.id, actorUserId);
    console.log(`✅ CatRelationship published successfully (Artifact v${resRel.artifactVersion})`);
  } else {
    console.warn("⚠ CatRelationship entity not found.");
  }

  if (contact) {
    console.log(`Publishing CatContact [${contact.id}]...`);
    const resContact = await publishService.publishEntity(contact.id, actorUserId);
    console.log(`✅ CatContact published successfully (Artifact v${resContact.artifactVersion})`);
  } else {
    console.warn("⚠ CatContact entity not found.");
  }
}

main()
  .catch((err) => {
    console.error("❌ Publish failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
