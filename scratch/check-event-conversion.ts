import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai" });
async function main() {
  const events = await pool.query(`SELECT * FROM cat_events ORDER BY created_at DESC`);
  console.log("cat_events:", JSON.stringify(events.rows, null, 2));
  const q = await pool.query(`SELECT id, converted_event_id, converted_at, converted_by FROM cat_quotations WHERE id = $1::uuid`, ['20b7afb2-da95-4473-9ffa-201329d22d6b']);
  console.log("quotation conversion state:", JSON.stringify(q.rows, null, 2));
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
