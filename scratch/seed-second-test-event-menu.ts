import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  const eventRes = await pool.query(`SELECT id, tenant_id FROM cat_events WHERE event_number = 'EVT-2026-TEST002'`);
  if (eventRes.rows.length === 0) throw new Error("Test event EVT-2026-TEST002 not found — run create-second-test-event.ts first.");
  const { id: eventId, tenant_id: tenantId } = eventRes.rows[0];

  const mealRes = await pool.query(
    `INSERT INTO cat_event_meals (id, tenant_id, event_id, meal_name, display_order, created_at)
     VALUES (gen_random_uuid(), $1, $2, 'Breakfast', 0, NOW()) RETURNING id`,
    [tenantId, eventId],
  );
  const mealId = mealRes.rows[0].id;

  const categoryRes = await pool.query(
    `INSERT INTO cat_event_menu_categories (id, tenant_id, event_id, meal_id, category_name, display_order, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'Continental', 0, NOW()) RETURNING id`,
    [tenantId, eventId, mealId],
  );
  const categoryId = categoryRes.rows[0].id;

  await pool.query(
    `INSERT INTO cat_event_menu_items (id, tenant_id, event_id, category_id, item_name, quantity, unit, remarks, display_order, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'Croissant Basket', 100, 'pcs', 'COPY-FROM-EVENT-TEST-MARKER', 0, NOW())`,
    [tenantId, eventId, categoryId],
  );

  console.log("Seeded EVT-2026-TEST002 menu: Breakfast -> Continental -> Croissant Basket");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
