import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  const templatesRes = await pool.query(
    `DELETE FROM cat_menu_templates WHERE template_name IN ('Test Template A', 'Saved From Event EVT-2026-000001', 'Debug Template') RETURNING template_name`,
  );
  console.log("Deleted test Menu Templates:", templatesRes.rows.map((r) => r.template_name));

  const eventRes = await pool.query(`DELETE FROM cat_events WHERE event_number = 'EVT-2026-TEST002' RETURNING event_number`);
  console.log("Deleted test Event (cascades its menu tables):", eventRes.rows.map((r) => r.event_number));

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
