import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai" });
async function main() {
  const rel = await pool.query(`SELECT id, tenant_id, name FROM cat_relationships WHERE id = $1::uuid`, ['03f4a852-d49e-479b-be59-203361272c2e']);
  console.log("relationship:", rel.rows);
  const distinctTenants = await pool.query(`SELECT DISTINCT tenant_id, count(*) FROM cat_contacts GROUP BY tenant_id`);
  console.log("cat_contacts tenant_id distribution:", distinctTenants.rows);
  const distinctRelTenants = await pool.query(`SELECT DISTINCT tenant_id, count(*) FROM cat_relationships GROUP BY tenant_id`);
  console.log("cat_relationships tenant_id distribution:", distinctRelTenants.rows);
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
