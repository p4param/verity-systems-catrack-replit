import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// QM-WP04C — Revision Management: Snapshot Viewer.
// Read-only fetch of a single immutable ProposalPublication snapshot, by
// revision number. No editing — this endpoint has no PATCH/PUT/DELETE.

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id, revisionNumber } = params;

    const revisionNum = Number(revisionNumber);
    if (!Number.isInteger(revisionNum)) {
      return NextResponse.json({ success: false, error: 'Invalid revision number' }, { status: 400 });
    }

    const rows: any[] = await prisma.$queryRaw`
      SELECT
        pub.id,
        pub.revision_number as "revisionNumber",
        pub.status,
        pub.snapshot_json as "snapshotJson",
        pub.published_at as "publishedAt",
        pub.published_by as "publishedById",
        u."fullName" as "publishedByName"
      FROM cat_quotation_publications pub
      LEFT JOIN users u ON u.id = pub.published_by
      WHERE pub.quotation_id = ${id}::uuid AND pub.tenant_id = ${tenantId}::uuid AND pub.revision_number = ${revisionNum}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ success: false, error: 'Published revision not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      publication: {
        id: row.id,
        revisionNumber: row.revisionNumber,
        status: row.status,
        publishedAt: row.publishedAt,
        publishedBy: row.publishedById ? { id: row.publishedById, fullName: row.publishedByName || 'Unknown' } : undefined,
        snapshot: row.snapshotJson,
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Proposal Publication snapshot:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
