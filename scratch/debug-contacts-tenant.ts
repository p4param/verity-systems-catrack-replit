import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

const QUOTATION_ID = "20b7afb2-da95-4473-9ffa-201329d22d6b";
const TENANT_ID = "97672afb-a724-4290-9706-68699e9ad07d";

async function main() {
  const q = await pool.query(`SELECT id, tenant_id, inquiry_id FROM cat_quotations WHERE id = $1::uuid`, [QUOTATION_ID]);
  console.log("quotation:", q.rows);

  const i = await pool.query(`SELECT id, tenant_id, relationship_id FROM cat_inquiries WHERE id = $1::uuid`, [q.rows[0].inquiry_id]);
  console.log("inquiry:", i.rows);

  const c = await pool.query(
    `SELECT id, tenant_id, relationship_id, name, email, is_deleted FROM cat_contacts WHERE relationship_id = $1::uuid`,
    [i.rows[0].relationship_id],
  );
  console.log("contacts (no tenant filter):", c.rows);

  const withTenant = await pool.query(
    `SELECT c.id, c.name, c.email FROM cat_quotations q
     JOIN cat_inquiries i ON i.id = q.inquiry_id
     JOIN cat_contacts c ON c.relationship_id = i.relationship_id
     WHERE q.id = $1::uuid AND q.tenant_id = $2::uuid AND c.tenant_id = $2::uuid AND c.is_deleted = false`,
    [QUOTATION_ID, TENANT_ID],
  );
  console.log("full join WITH tenant filter (matching route.ts):", withTenant.rows);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
