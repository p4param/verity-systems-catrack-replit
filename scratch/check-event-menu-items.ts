import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  const res = await pool.query(`
    SELECT i.item_name, i.unit, i.remarks, i.updated_at
    FROM cat_event_menu_items i
    JOIN cat_events e ON e.id = i.event_id
    WHERE e.event_number = 'EVT-2026-000001'
    ORDER BY i.display_order ASC
  `);
  console.log("Current Menu Items for EVT-2026-000001:", res.rows);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
