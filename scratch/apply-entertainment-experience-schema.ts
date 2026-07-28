import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

async function main() {
  console.log("--- Applying DB Schema for Entertainment & Add-ons Discovery (IM-WP02C-07) ---");

  await pool.query(`
    ALTER TABLE cat_inquiry_discovery_areas
    ADD COLUMN IF NOT EXISTS entertainment_addons JSONB;
  `);
  console.log("1. Checked/Added 'entertainment_addons' JSONB column to 'cat_inquiry_discovery_areas'");

  console.log("--- DB Schema Check Complete ---");
  await pool.end();
}

main().catch((err) => {
  console.error("DB schema application error:", err);
  process.exit(1);
});
