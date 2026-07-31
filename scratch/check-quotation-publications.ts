import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  const pubs = await pool.query(
    "SELECT id, tenant_id, quotation_id, revision_number, status, published_at, published_by FROM cat_quotation_publications ORDER BY published_at DESC LIMIT 20",
  );
  console.log("--- cat_quotation_publications rows ---");
  console.log(JSON.stringify(pubs.rows, null, 2));

  const revs = await pool.query(
    "SELECT id, tenant_id, quotation_id, revision_number, status, is_current, created_at FROM cat_quotation_revisions ORDER BY created_at DESC LIMIT 20",
  );
  console.log("--- cat_quotation_revisions rows ---");
  console.log(JSON.stringify(revs.rows, null, 2));

  const quotes = await pool.query(
    "SELECT id, tenant_id, quotation_number, title, status, updated_at FROM cat_quotations ORDER BY updated_at DESC LIMIT 20",
  );
  console.log("--- cat_quotations rows ---");
  console.log(JSON.stringify(quotes.rows, null, 2));

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
