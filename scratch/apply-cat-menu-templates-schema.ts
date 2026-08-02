import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  console.log("--- Applying DB Schema for Menu Templates (EM-WP04) ---");

  const sql = readFileSync(join(__dirname, "../prisma/migrations/20260801180000_add_cat_menu_templates/migration.sql"), "utf-8");
  await pool.query(sql);
  console.log("1. Created cat_menu_templates, cat_menu_template_meals, cat_menu_template_categories, cat_menu_template_items, cat_menu_template_dietary_requirements, cat_menu_template_settings (if not already present)");

  console.log("--- DB Schema Check Complete ---");
  await pool.end();
}

main().catch((err) => {
  console.error("DB schema application error:", err);
  process.exit(1);
});
