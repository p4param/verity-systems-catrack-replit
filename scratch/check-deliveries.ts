import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai" });
async function main() {
  const res = await pool.query(
    `SELECT revision_number, channel, status, recipient_name, recipient_email, subject, delivered_at, delivered_by
     FROM cat_quotation_proposal_deliveries
     WHERE quotation_id = $1::uuid ORDER BY delivered_at DESC`,
    ['20b7afb2-da95-4473-9ffa-201329d22d6b'],
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
