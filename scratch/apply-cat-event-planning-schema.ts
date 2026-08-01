import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  console.log("--- Applying DB Schema for Event Planning (EM-WP02) ---");

  const sql = readFileSync(join(__dirname, "../prisma/migrations/20260801160000_add_cat_event_planning/migration.sql"), "utf-8");
  await pool.query(sql);
  console.log("1. Created cat_event_planning, cat_event_timeline_items, cat_event_key_contacts, cat_event_risks, cat_event_planning_checklist_items (if not already present)");

  console.log("--- DB Schema Check Complete ---");
  await pool.end();
}

main().catch((err) => {
  console.error("DB schema application error:", err);
  process.exit(1);
});
