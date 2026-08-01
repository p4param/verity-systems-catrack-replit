import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai" });
async function main() {
  const res = await pool.query(`SELECT id FROM cat_events WHERE origin_quotation_id = $1::uuid`, ['20b7afb2-da95-4473-9ffa-201329d22d6b']);
  console.log(res.rows[0]?.id);
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
