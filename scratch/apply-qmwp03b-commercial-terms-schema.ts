import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  console.log("--- Applying DB Schema for Payment & Commercial Terms Workspace (QM-WP03B) ---");

  const sql = readFileSync(
    join(__dirname, "../prisma/migrations/20260730150000_add_commercial_terms/migration.sql"),
    "utf-8",
  );
  await pool.query(sql);
  console.log("1. Added valid_until, validity_notes, payment_method, advance_required, advance_type, advance_value, balance_payment, commercial_notes, currency_code, commercial_terms_status to cat_quotations (if not already present)");

  console.log("--- DB Schema Check Complete ---");
  await pool.end();
}

main().catch((err) => {
  console.error("DB schema application error:", err);
  process.exit(1);
});
