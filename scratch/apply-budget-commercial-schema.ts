import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  console.log("--- Applying DB Schema for Budget & Commercial Discovery (IM-WP02C-04) ---");

  // 1. Add budget_commercial column to cat_inquiry_discovery_areas if not exists
  await pool.query(`
    ALTER TABLE cat_inquiry_discovery_areas
    ADD COLUMN IF NOT EXISTS budget_commercial JSONB;
  `);
  console.log("1. Checked/Added 'budget_commercial' JSONB column to 'cat_inquiry_discovery_areas'");

  // 2. Ensure BUDGET_COMMERCIALS mandatory discovery area exists for existing inquiries
  const inquiriesRes = await pool.query(`SELECT id, tenant_id FROM cat_inquiries`);
  for (const inq of inquiriesRes.rows) {
    const checkRes = await pool.query(
      `SELECT id FROM cat_inquiry_discovery_areas WHERE inquiry_id = $1 AND area_key = 'BUDGET_COMMERCIALS'`,
      [inq.id]
    );

    if (checkRes.rows.length === 0) {
      await pool.query(
        `INSERT INTO cat_inquiry_discovery_areas 
          (id, tenant_id, inquiry_id, area_key, title, is_mandatory, question, lifecycle, validation, summary, updated_at)
         VALUES 
          (gen_random_uuid(), $1, $2, 'BUDGET_COMMERCIALS', 'Budget & Commercial Expectations', true, 'What are your financial expectations, investment priorities, and payment preferences?', 'NOT_STARTED', 'NEEDS_ATTENTION', '', NOW())`,
        [inq.tenant_id, inq.id]
      );
      console.log(`Created BUDGET_COMMERCIALS discovery area for inquiry ${inq.id}`);
    }
  }

  console.log("--- DB Schema Check Complete ---");
  await pool.end();
}

main().catch((err) => {
  console.error("DB schema application error:", err);
  process.exit(1);
});
