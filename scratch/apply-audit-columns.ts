import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding generalized audit columns to cat_venues...');
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE cat_venues
      ADD COLUMN IF NOT EXISTS creation_source VARCHAR(50) DEFAULT 'MANUAL',
      ADD COLUMN IF NOT EXISTS created_from_module VARCHAR(50),
      ADD COLUMN IF NOT EXISTS created_from_record_id UUID,
      ADD COLUMN IF NOT EXISTS created_from_record_number VARCHAR(50);
  `);

  console.log('Successfully updated cat_venues table schema with audit columns!');
}

main()
  .catch((e) => {
    console.error('Audit columns migration error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
