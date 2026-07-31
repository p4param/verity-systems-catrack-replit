import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

const QUOTATION_ID = "20b7afb2-da95-4473-9ffa-201329d22d6b";

async function main() {
  const res = await pool.query(
    `SELECT c.id, c.name, c.email, c.role, c.is_primary
     FROM cat_quotations q
     JOIN cat_inquiries i ON i.id = q.inquiry_id
     JOIN cat_contacts c ON c.relationship_id = i.relationship_id
     WHERE q.id = $1::uuid AND c.is_deleted = false`,
    [QUOTATION_ID],
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
