import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai" });
async function main() {
  await pool.query(`UPDATE cat_quotations SET converted_event_id = NULL, converted_at = NULL, converted_by = NULL WHERE id = $1::uuid`, ['20b7afb2-da95-4473-9ffa-201329d22d6b']);
  await pool.query(`DELETE FROM cat_events WHERE origin_quotation_id = $1::uuid`, ['20b7afb2-da95-4473-9ffa-201329d22d6b']);
  console.log("Rolled back.");
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
