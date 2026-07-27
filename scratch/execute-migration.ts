import fs from 'fs';
import path from 'path';
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  const sqlPath = path.join(process.cwd(), 'prisma', 'migrations', '20260725200000_add_cat_venues', 'migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('Executing migration SQL via PrismaClient...');
  await prisma.$executeRawUnsafe(sql);
  console.log('Successfully executed migration SQL!');

  const result = await prisma.$queryRawUnsafe('SELECT count(*)::int as count FROM cat_venues');
  console.log('cat_venues table verification success:', result);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
