import { prisma } from './src/lib/prisma';
async function main() {
  const record = await prisma.entityRecord.findUnique({
    where: { id: 'b27c468b-b2eb-4744-a66e-1ae3e9f7aa9c' },
    include: { values: { include: { fieldDefinition: true } } }
  });
  console.log(JSON.stringify(record, null, 2));
}
main().finally(() => prisma.$disconnect());

