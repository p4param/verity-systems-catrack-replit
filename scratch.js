const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const modules = await prisma.platformModule.findMany();
  console.log('Total Modules:', modules.length);
  console.log('Active Modules:', modules.filter(m => m.isActive).length);
  
  const groups = await prisma.navigationGroup.findMany();
  console.log('Visible Groups:', groups.filter(g => g.isVisible).length);
  
  const items = await prisma.navigationItem.findMany();
  console.log('Visible Items:', items.filter(i => i.visible).length);
}

main().then(() => prisma.$disconnect());
