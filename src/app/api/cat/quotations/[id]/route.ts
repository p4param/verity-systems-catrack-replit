import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

const ALLOWED_STATUSES = [
  'DRAFT',
  'INTERNAL_REVIEW',
  'SHARED',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
];

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const rows: any[] = await prisma.$queryRaw`
      SELECT
        q.id,
        q.quotation_number as "quotationNumber",
        q.title,
        q.purpose,
        q.description,
        q.status,
        q.inquiry_id as "inquiryId",
        q.proposal_objective as "proposalObjective",
        q.executive_notes as "executiveNotes",
        q.executive_summary_status as "executiveSummaryStatus",
        q.scope_of_services_status as "scopeOfServicesStatus",
        q.proposal_narrative_status as "proposalNarrativeStatus",
        q.proposal_highlights_status as "proposalHighlightsStatus",
        q.assumptions_exclusions_status as "assumptionsExclusionsStatus",
        q.commercial_pricing_status as "commercialPricingStatus",
        q.commercial_terms_status as "commercialTermsStatus",
        i.inquiry_number as "inquiryNumber",
        i.title as "inquiryTitle",
        i.relationship_id as "relationshipId",
        r.name as "relationshipName",
        i.event_type as "occasion",
        i.tentative_event_date as "eventDate",
        i.expected_guest_count as "guestCount",
        i.venue as "venueName",
        q.created_at as "createdAt",
        q.updated_at as "updatedAt",
        rev.id as "revisionId",
        rev.revision_number as "revisionNumber",
        rev.status as "revisionStatus",
        rev.created_at as "revisionCreatedAt"
      FROM cat_quotations q
      JOIN cat_inquiries i ON q.inquiry_id = i.id
      LEFT JOIN cat_relationships r ON i.relationship_id = r.id
      LEFT JOIN cat_quotation_revisions rev ON rev.quotation_id = q.id AND rev.is_current = true
      WHERE q.id = ${id}::uuid
        AND q.tenant_id = ${tenantId}::uuid
        AND q.is_deleted = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ success: false, error: 'Quotation record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      quotation: {
        id: row.id,
        quotationNumber: row.quotationNumber,
        title: row.title,
        purpose: row.purpose,
        description: row.description,
        status: row.status,
        inquiryId: row.inquiryId,
        proposalObjective: row.proposalObjective,
        executiveNotes: row.executiveNotes,
        executiveSummaryStatus: row.executiveSummaryStatus || 'NOT_STARTED',
        scopeOfServicesStatus: row.scopeOfServicesStatus || 'NOT_STARTED',
        proposalNarrativeStatus: row.proposalNarrativeStatus || 'NOT_STARTED',
        proposalHighlightsStatus: row.proposalHighlightsStatus || 'NOT_STARTED',
        assumptionsExclusionsStatus: row.assumptionsExclusionsStatus || 'NOT_STARTED',
        commercialPricingStatus: row.commercialPricingStatus || 'NOT_STARTED',
        commercialTermsStatus: row.commercialTermsStatus || 'NOT_STARTED',
        inquiryNumber: row.inquiryNumber,
        inquiryTitle: row.inquiryTitle,
        relationshipId: row.relationshipId,
        relationshipName: row.relationshipName,
        occasion: row.occasion,
        eventDate: row.eventDate,
        guestCount: row.guestCount,
        venueName: row.venueName,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        currentRevision: {
          id: row.revisionId,
          revisionNumber: row.revisionNumber,
          status: row.revisionStatus,
          createdAt: row.revisionCreatedAt,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching quotation:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const body = await req.json();
    const { title, purpose, description, status } = body as {
      title?: string;
      purpose?: string;
      description?: string;
      status?: string;
    };

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status value' }, { status: 400 });
    }

    const existing: any[] = await prisma.$queryRaw`
      SELECT id FROM cat_quotations
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
      LIMIT 1
    `;
    if (!existing[0]) {
      return NextResponse.json({ success: false, error: 'Quotation record not found' }, { status: 404 });
    }

    // Status is persisted only in QM-WP01 — no transition rules, no automation.
    await prisma.$executeRaw`
      UPDATE cat_quotations
      SET
        title = COALESCE(${title ?? null}, title),
        purpose = COALESCE(${purpose ?? null}, purpose),
        description = COALESCE(${description ?? null}, description),
        status = COALESCE(${status ?? null}, status),
        updated_at = NOW(),
        updated_by = ${userId}::uuid
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error updating quotation:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
