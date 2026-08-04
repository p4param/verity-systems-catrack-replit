import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

const TABLES = [
  "cat_relationships",
  "cat_contacts",
  "cat_inquiries",
  "cat_inquiry_discovery_areas",
  "cat_quotations",
  "cat_quotation_revisions",
  "cat_quotation_scope_of_services",
  "cat_quotation_proposal_highlights",
  "cat_quotation_proposal_assumptions",
  "cat_quotation_proposal_exclusions",
  "cat_quotation_commercial_pricing",
  "cat_quotation_commercial_terms",
  "cat_quotation_publications",
  "cat_quotation_proposal_deliveries",
  "cat_quotation_proposal_decisions",
  "cat_events",
];

async function main() {
  for (const table of TABLES) {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = $1 AND table_schema = 'public'
       ORDER BY ordinal_position`,
      [table],
    );
    if (res.rows.length === 0) {
      console.log(`\n=== ${table} === (NOT FOUND)`);
      continue;
    }
    console.log(`\n=== ${table} ===`);
    for (const row of res.rows) {
      console.log(`  ${row.column_name} | ${row.data_type} | nullable=${row.is_nullable} | default=${row.column_default}`);
    }
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
