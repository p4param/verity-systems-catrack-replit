import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// QM-WP04C — Revision Management.
// Read-only view over the publication model established in QM-WP04A: the
// Working Draft (the current, editable revision) and the list of published
// revisions only (unpublished revisions, e.g. a fresh Revision 0 that has
// never been published, are represented by the Working Draft panel, not by
// a row in this list).

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const quotationRows: any[] = await prisma.$queryRaw`
      SELECT status, updated_at as "updatedAt"
      FROM cat_quotations
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
      LIMIT 1
    `;
    const quotation = quotationRows[0];
    if (!quotation) {
      return NextResponse.json({ success: false, error: 'Quotation record not found' }, { status: 404 });
    }

    const currentRevisionRows: any[] = await prisma.$queryRaw`
      SELECT revision_number as "revisionNumber"
      FROM cat_quotation_revisions
      WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_current = true
      LIMIT 1
    `;
    const currentRevisionNumber = currentRevisionRows[0]?.revisionNumber ?? 0;

    const publications: any[] = await prisma.$queryRaw`
      SELECT
        pub.id,
        pub.revision_number as "revisionNumber",
        pub.published_at as "publishedAt",
        pub.published_by as "publishedById",
        u."fullName" as "publishedByName"
      FROM cat_quotation_publications pub
      LEFT JOIN users u ON u.id = pub.published_by
      WHERE pub.quotation_id = ${id}::uuid AND pub.tenant_id = ${tenantId}::uuid
      ORDER BY pub.revision_number DESC
    `;

    const latestPublishedAt: Date | null = publications[0]?.publishedAt ? new Date(publications[0].publishedAt) : null;
    const hasUnpublishedChanges = !latestPublishedAt || new Date(quotation.updatedAt) > latestPublishedAt;

    const publishedRevisions = publications.map((pub, index) => ({
      id: pub.id,
      revisionNumber: pub.revisionNumber,
      publishedAt: pub.publishedAt,
      publishedBy: pub.publishedById ? { id: pub.publishedById, fullName: pub.publishedByName || 'Unknown' } : undefined,
      status: index === 0 ? 'CURRENT_PUBLISHED' : 'SUPERSEDED',
    }));

    return NextResponse.json({
      success: true,
      workingDraft: {
        status: quotation.status,
        lastModifiedAt: quotation.updatedAt,
        currentRevisionNumber,
        hasUnpublishedChanges,
      },
      publishedRevisions,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Quotation Revisions:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
