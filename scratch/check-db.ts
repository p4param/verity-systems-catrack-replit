import { PrismaClient } from "../src/generated/client";
const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.navigationGroup.findMany();
  const items = await prisma.navigationItem.findMany();
  const layouts = await prisma.navigationLayout.findMany();
  const modules = await prisma.platformModule.findMany();

  console.log("Groups count:", groups.length);
  console.log("Items count:", items.length);
  console.log("Layouts count:", layouts.length);
  console.log("Modules count:", modules.length);

  if (groups.length > 0) {
    console.log("Groups:", groups.map(g => g.name));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
