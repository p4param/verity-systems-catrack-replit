const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const record = await prisma.entityRecord.findUnique({
    where: { id: 'b27c468b-b2eb-4744-a66e-1ae3e9f7aa9c' },
    include: { values: true }
  });
  console.log(JSON.stringify(record, null, 2));
}
main().finally(() => prisma.$disconnect());
