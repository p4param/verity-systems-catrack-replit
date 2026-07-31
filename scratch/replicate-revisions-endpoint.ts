import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

const QUOTATION_ID = "20b7afb2-da95-4473-9ffa-201329d22d6b";
const TENANT_ID = "97672afb-a724-4290-9706-68699e9ad07d";

// Mirrors src/app/api/cat/quotations/[id]/revisions/route.ts exactly.
async function main() {
  const quotationRows = await pool.query(
    `SELECT status, updated_at as "updatedAt" FROM cat_quotations WHERE id = $1::uuid AND tenant_id = $2::uuid AND is_deleted = false LIMIT 1`,
    [QUOTATION_ID, TENANT_ID],
  );
  const quotation = quotationRows.rows[0];

  const currentRevisionRows = await pool.query(
    `SELECT revision_number as "revisionNumber" FROM cat_quotation_revisions WHERE quotation_id = $1::uuid AND tenant_id = $2::uuid AND is_current = true LIMIT 1`,
    [QUOTATION_ID, TENANT_ID],
  );
  const currentRevisionNumber = currentRevisionRows.rows[0]?.revisionNumber ?? 0;

  const publications = await pool.query(
    `SELECT pub.id, pub.revision_number as "revisionNumber", pub.published_at as "publishedAt", pub.published_by as "publishedById", u."fullName" as "publishedByName"
     FROM cat_quotation_publications pub
     LEFT JOIN users u ON u.id = pub.published_by
     WHERE pub.quotation_id = $1::uuid AND pub.tenant_id = $2::uuid
     ORDER BY pub.revision_number DESC`,
    [QUOTATION_ID, TENANT_ID],
  );

  const latestPublishedAt = publications.rows[0]?.publishedAt ? new Date(publications.rows[0].publishedAt) : null;
  const hasUnpublishedChanges = !latestPublishedAt || new Date(quotation.updatedAt) > latestPublishedAt;

  const publishedRevisions = publications.rows.map((pub, index) => ({
    id: pub.id,
    revisionNumber: pub.revisionNumber,
    publishedAt: pub.publishedAt,
    publishedBy: pub.publishedById ? { id: pub.publishedById, fullName: pub.publishedByName || "Unknown" } : undefined,
    status: index === 0 ? "CURRENT_PUBLISHED" : "SUPERSEDED",
  }));

  const response = {
    success: true,
    workingDraft: {
      status: quotation.status,
      lastModifiedAt: quotation.updatedAt,
      currentRevisionNumber,
      hasUnpublishedChanges,
    },
    publishedRevisions,
  };

  console.log(JSON.stringify(response, null, 2));

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
