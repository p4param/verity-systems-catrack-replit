import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  const res = await pool.query(`
    SELECT t.typname as enum_name, e.enumlabel as value
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname IN ('RelationshipType', 'RelationshipStatus')
    ORDER BY t.typname, e.enumsortorder
  `);
  for (const row of res.rows) console.log(row.enum_name, '=', row.value);

  // Sample existing relationship/contact/inquiry rows for realistic reference.
  const rel = await pool.query(`SELECT id, tenant_id, name, type, status FROM cat_relationships LIMIT 5`);
  console.log('\nSample relationships:', rel.rows);

  const tenantRes = await pool.query(`SELECT DISTINCT tenant_id FROM cat_relationships LIMIT 3`);
  console.log('\nDistinct tenant_ids in cat_relationships:', tenantRes.rows);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
