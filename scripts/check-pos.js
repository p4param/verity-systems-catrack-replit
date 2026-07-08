const { PrismaClient } = require('../src/generated/client');
const prisma = new PrismaClient();

async function main() {
    const pos = await prisma.purchaseOrder.findMany({ include: { supplier: true, items: true } });
    console.dir(pos, { depth: null });
}

main().finally(() => prisma.$disconnect());
