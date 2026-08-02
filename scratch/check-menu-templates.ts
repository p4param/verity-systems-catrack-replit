import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  const res = await pool.query(`SELECT id, template_name, description, created_at FROM cat_menu_templates ORDER BY created_at DESC`);
  console.log("Templates:", res.rows);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
