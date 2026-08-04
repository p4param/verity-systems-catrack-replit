import { Pool } from "pg";

// Shared helper for the official demo dataset seed scripts
// (scripts/seed-demo-*.ts). Every demo seed script is tenant-scoped to
// the admin@verity.com tenant and stamps created_by/updated_by with that
// user, matching every other one-off script in this repository.

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
  return new Pool({ connectionString });
}

export async function getAdminAndTenant(pool: Pool): Promise<{ tenantId: string; adminId: string }> {
  const res = await pool.query(`SELECT id, "tenantId" FROM users WHERE email = 'admin@verity.com' LIMIT 1`);
  if (res.rows.length === 0) throw new Error('Admin user (admin@verity.com) not found');
  return { tenantId: res.rows[0].tenantId, adminId: res.rows[0].id };
}

// Idempotent "find by natural key, insert or update" — every demo seed
// script uses this same shape: look up an existing row by a stable
// business key (name, code, etc.), then either UPDATE it in place or
// INSERT it fresh. Running any script twice never creates duplicates.
export async function upsertByKey(
  pool: Pool,
  table: string,
  keyColumns: Record<string, any>,
  valueColumns: Record<string, any>,
): Promise<{ id: string; created: boolean }> {
  const keyEntries = Object.entries(keyColumns);
  const whereClause = keyEntries.map(([col], i) => `"${col}" = $${i + 1}`).join(" AND ");
  const keyParams = keyEntries.map(([, v]) => v);

  const existing = await pool.query(`SELECT id FROM ${table} WHERE ${whereClause} LIMIT 1`, keyParams);
  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    const valueEntries = Object.entries(valueColumns);
    if (valueEntries.length > 0) {
      const setClause = valueEntries.map(([col], i) => `"${col}" = $${i + 2}`).join(", ");
      const params = [id, ...valueEntries.map(([, v]) => v)];
      await pool.query(`UPDATE ${table} SET ${setClause} WHERE id = $1`, params);
    }
    return { id, created: false };
  }

  const allEntries = [...keyEntries, ...Object.entries(valueColumns)];
  const columns = allEntries.map(([col]) => `"${col}"`).join(", ");
  const placeholders = allEntries.map((_, i) => `$${i + 1}`).join(", ");
  const params = allEntries.map(([, v]) => v);
  const inserted = await pool.query(`INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING id`, params);
  return { id: inserted.rows[0].id, created: true };
}
