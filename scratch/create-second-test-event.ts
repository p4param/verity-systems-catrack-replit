import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  const existing = await pool.query(`SELECT id, tenant_id, relationship_id, origin_quotation_id, origin_quotation_revision, currency_code FROM cat_events LIMIT 1`);
  if (existing.rows.length === 0) throw new Error("No existing event found to model the test event on.");
  const base = existing.rows[0];

  const countRow = await pool.query(`SELECT COUNT(*)::int as count FROM cat_events WHERE tenant_id = $1`, [base.tenant_id]);
  const seq = countRow.rows[0].count + 1;
  const eventNumber = `EVT-2026-TEST${String(seq).padStart(3, '0')}`;

  const insert = await pool.query(
    `INSERT INTO cat_events (id, tenant_id, event_number, relationship_id, origin_quotation_id, origin_quotation_revision, event_name, event_type, status, currency_code, created_at, is_deleted)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'EM-WP04 Copy-From-Event Test Source', 'CORPORATE', 'PLANNING', $6, NOW(), false)
     RETURNING id, event_number as "eventNumber"`,
    [base.tenant_id, eventNumber, base.relationship_id, base.origin_quotation_id, base.origin_quotation_revision, base.currency_code],
  );

  console.log("Created test event:", insert.rows[0]);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
