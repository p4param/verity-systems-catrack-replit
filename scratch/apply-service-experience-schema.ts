import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  console.log("--- Applying DB Schema for Service Experience Discovery (IM-WP02C-06) ---");

  await pool.query(`
    ALTER TABLE cat_inquiry_discovery_areas
    ADD COLUMN IF NOT EXISTS service_experience JSONB;
  `);
  console.log("1. Checked/Added 'service_experience' JSONB column to 'cat_inquiry_discovery_areas'");

  console.log("--- DB Schema Check Complete ---");
  await pool.end();
}

main().catch((err) => {
  console.error("DB schema application error:", err);
  process.exit(1);
});
