import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  console.log("--- Applying DB Schema for Event Conversion (QM-WP04E) ---");

  const sql = readFileSync(join(__dirname, "../prisma/migrations/20260801100000_add_cat_events/migration.sql"), "utf-8");
  await pool.query(sql);
  console.log("1. Created 'cat_events' table and cat_quotations conversion columns (if not already present)");

  console.log("--- DB Schema Check Complete ---");
  await pool.end();
}

main().catch((err) => {
  console.error("DB schema application error:", err);
  process.exit(1);
});
