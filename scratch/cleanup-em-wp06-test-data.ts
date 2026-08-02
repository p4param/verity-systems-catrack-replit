import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  const res = await pool.query(`DELETE FROM cat_menu_catalog_items WHERE name = 'Tandoori Platter' RETURNING name`);
  console.log("Deleted test Catalog items (cascades recipes):", res.rows.map((r) => r.name));
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
