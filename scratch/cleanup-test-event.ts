import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai" });
async function main() {
  // Roll back the test conversion so we can re-test the flow cleanly.
  await pool.query(`UPDATE cat_quotations SET converted_event_id = NULL, converted_at = NULL, converted_by = NULL WHERE id = $1::uuid`, ['20b7afb2-da95-4473-9ffa-201329d22d6b']);
  await pool.query(`DELETE FROM cat_events WHERE id = $1::uuid`, ['84b14a3d-f8cd-43f6-b4a0-ceb676dbc640']);
  console.log("Rolled back test conversion.");
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
