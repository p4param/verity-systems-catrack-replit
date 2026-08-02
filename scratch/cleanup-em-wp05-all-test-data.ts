import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  const catalogRes = await pool.query(`DELETE FROM cat_menu_catalog_items WHERE name = 'Paneer Tikka' RETURNING name`);
  console.log("Deleted test Catalog items:", catalogRes.rows.map((r) => r.name));

  const itemsRes = await pool.query(`
    DELETE FROM cat_event_menu_items
    WHERE item_name IN ('Paneer Tikka', 'Manual One-off Item')
      AND event_id = (SELECT id FROM cat_events WHERE event_number = 'EVT-2026-000001')
    RETURNING item_name
  `);
  console.log("Deleted test Event Menu Items:", itemsRes.rows.map((r) => r.item_name));

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
