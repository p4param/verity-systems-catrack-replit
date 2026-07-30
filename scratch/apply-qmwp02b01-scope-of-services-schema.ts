import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  console.log("--- Applying DB Schema for Scope of Services Workspace (QM-WP02B-01) ---");

  const sql = readFileSync(
    join(__dirname, "../prisma/migrations/20260730100000_add_scope_of_services/migration.sql"),
    "utf-8",
  );
  await pool.query(sql);
  console.log("1. Added scope_of_services_status to cat_quotations and created cat_quotation_scope_service_blocks (if not already present)");

  console.log("--- DB Schema Check Complete ---");
  await pool.end();
}

main().catch((err) => {
  console.error("DB schema application error:", err);
  process.exit(1);
});
