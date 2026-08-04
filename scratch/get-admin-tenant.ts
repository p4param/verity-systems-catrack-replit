import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  const res = await pool.query(`SELECT id, "tenantId", email, "fullName" FROM users WHERE email = 'admin@verity.com'`);
  console.log(res.rows);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
