import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  await pool.query(`DELETE FROM cat_menu_templates WHERE template_name = 'Debug Template'`);
  console.log("Cleaned up Debug Template.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
