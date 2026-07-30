import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  console.log("--- Applying DB Schema for Proposal Builder Shell (QM-WP02A) ---");

  const sql = readFileSync(
    join(__dirname, "../prisma/migrations/20260729130000_add_quotation_executive_summary/migration.sql"),
    "utf-8",
  );
  await pool.query(sql);
  console.log("1. Added proposal_objective, executive_notes, executive_summary_status to cat_quotations (if not already present)");

  console.log("--- DB Schema Check Complete ---");
  await pool.end();
}

main().catch((err) => {
  console.error("DB schema application error:", err);
  process.exit(1);
});
