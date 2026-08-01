import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { CustomerDecisionType } from '@/modules/cat/quotation/domain/customer-decision-types';

// QM-WP04E — Event Conversion.
// The Sales -> Operations transition. Not an Event Creation wizard — a
// one-time, read-only-confirmation business transition. GET reports
// eligibility (or, once converted, the permanent audit record); POST
// performs the conversion inside a single transaction and can never repeat
// for the same Quotation.

async function fetchCurrentPublishedRevision(db: any, quotationId: string, tenantId: string) {
  const rows: any[] = await db.$queryRaw`
    SELECT
      pub.revision_number as "revisionNumber",
      pub.published_at as "publishedAt",
      pub.published_by as "publishedById",
      u."fullName" as "publishedByName"
    FROM cat_quotation_publications pub
    LEFT JOIN users u ON u.id = pub.published_by
    WHERE pub.quotation_id = ${quotationId}::uuid AND pub.tenant_id = ${tenantId}::uuid
    ORDER BY pub.revision_number DESC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    revisionNumber: row.revisionNumber,
    publishedAt: row.publishedAt,
    publishedBy: row.publishedById ? { id: row.publishedById, fullName: row.publishedByName || 'Unknown' } : undefined,
  };
}

async function fetchCurrentDecision(db: any, quotationId: string, tenantId: string) {
  const rows: any[] = await db.$queryRaw`
    SELECT decision, notes, recorded_at as "recordedAt"
    FROM cat_quotation_proposal_decisions
    WHERE quotation_id = ${quotationId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY recorded_at DESC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { decision: row.decision as CustomerDecisionType, notes: row.notes, recordedAt: row.recordedAt };
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const qRows: any[] = await prisma.$queryRaw`
      SELECT id, converted_event_id as "convertedEventId"
      FROM cat_quotations
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
      LIMIT 1
    `;
    if (!qRows[0]) {
      return NextResponse.json({ success: false, error: 'Quotation record not found' }, { status: 404 });
    }

    if (qRows[0].convertedEventId) {
      const evRows: any[] = await prisma.$queryRaw`
        SELECT
          e.id, e.event_number as "eventNumber", e.status, e.origin_quotation_revision as "originQuotationRevision",
          q.converted_at as "convertedAt", q.converted_by as "convertedById", u."fullName" as "convertedByName"
        FROM cat_events e
        JOIN cat_quotations q ON q.converted_event_id = e.id
        LEFT JOIN users u ON u.id = q.converted_by
        WHERE e.id = ${qRows[0].convertedEventId}::uuid AND e.tenant_id = ${tenantId}::uuid
        LIMIT 1
      `;
      const ev = evRows[0];
      return NextResponse.json({
        success: true,
        eligible: false,
        reasons: [],
        currentPublishedRevision: null,
        currentDecision: null,
        alreadyConverted: true,
        conversion: ev
          ? {
              eventId: ev.id,
              eventNumber: ev.eventNumber,
              eventStatus: ev.status,
              originQuotationRevision: ev.originQuotationRevision,
              convertedAt: ev.convertedAt,
              convertedBy: ev.convertedById ? { id: ev.convertedById, fullName: ev.convertedByName || 'Unknown' } : undefined,
            }
          : null,
      });
    }

    const currentPublishedRevision = await fetchCurrentPublishedRevision(prisma, id, tenantId);
    const currentDecision = await fetchCurrentDecision(prisma, id, tenantId);

    const reasons: string[] = [];
    if (!currentPublishedRevision) reasons.push('No published revision exists for this quotation.');
    if (!currentDecision) reasons.push('No Customer Decision has been recorded yet.');
    else if (currentDecision.decision !== 'ACCEPTED') reasons.push(`Customer Decision must be Accepted (current: ${currentDecision.decision}).`);

    return NextResponse.json({
      success: true,
      eligible: reasons.length === 0,
      reasons,
      currentPublishedRevision,
      currentDecision,
      alreadyConverted: false,
      conversion: null,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching conversion eligibility:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, props: any) {
  try {
    // Both permissions are required — Event Conversion is a Sales ->
    // Operations transition, not solely a Quotation edit.
    const user = await requirePermission(req, 'CAT_EVENT_CREATE');
    await requirePermission(req, 'CAT_QUOTATION_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const result = await prisma.$transaction(async (tx) => {
      // Row-locked to make duplicate-conversion races impossible.
      const qRows: any[] = await tx.$queryRaw`
        SELECT id, title, quotation_number as "quotationNumber", inquiry_id as "inquiryId", converted_event_id as "convertedEventId"
        FROM cat_quotations
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
        FOR UPDATE
      `;
      const quotation = qRows[0];
      if (!quotation) {
        return { ok: false as const, status: 404, error: 'Quotation record not found' };
      }

      if (quotation.convertedEventId) {
        const evRows: any[] = await tx.$queryRaw`
          SELECT event_number as "eventNumber" FROM cat_events WHERE id = ${quotation.convertedEventId}::uuid
        `;
        return {
          ok: false as const,
          status: 409,
          error: 'This quotation has already been converted to an Event.',
          eventId: quotation.convertedEventId,
          eventNumber: evRows[0]?.eventNumber,
        };
      }

      const currentPublishedRevision = await fetchCurrentPublishedRevision(tx, id, tenantId);
      if (!currentPublishedRevision) {
        return { ok: false as const, status: 400, error: 'No published revision exists for this quotation.' };
      }

      const currentDecision = await fetchCurrentDecision(tx, id, tenantId);
      if (!currentDecision || currentDecision.decision !== 'ACCEPTED') {
        return { ok: false as const, status: 400, error: 'Customer Decision must be Accepted before converting to an Event.' };
      }

      const pubRows: any[] = await tx.$queryRaw`
        SELECT snapshot_json as "snapshotJson"
        FROM cat_quotation_publications
        WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND revision_number = ${currentPublishedRevision.revisionNumber}
        LIMIT 1
      `;
      const snapshot = pubRows[0]?.snapshotJson;
      const grandTotal = snapshot?.pricingSummary?.grandTotal ?? null;
      const currencyCode = snapshot?.commercialTerms?.currencyCode ?? 'INR';

      const inqRows: any[] = await tx.$queryRaw`
        SELECT relationship_id as "relationshipId", event_type as "eventType", tentative_event_date as "eventDate",
               venue, expected_guest_count as "guestCount"
        FROM cat_inquiries
        WHERE id = ${quotation.inquiryId}::uuid AND tenant_id = ${tenantId}::uuid
        LIMIT 1
      `;
      const inquiry = inqRows[0];
      if (!inquiry) {
        return { ok: false as const, status: 400, error: 'This quotation’s originating Inquiry could not be found.' };
      }

      const currentYear = new Date().getFullYear();
      const countRows: any[] = await tx.$queryRaw`
        SELECT COUNT(*)::int as count FROM cat_events WHERE tenant_id = ${tenantId}::uuid
      `;
      const seqNumber = (countRows[0]?.count || 0) + 1;
      const eventNumber = `EVT-${currentYear}-${String(seqNumber).padStart(6, '0')}`;

      const eventRows: any[] = await tx.$queryRaw`
        INSERT INTO cat_events (
          id, tenant_id, event_number, relationship_id, origin_quotation_id, origin_quotation_revision,
          event_name, event_type, event_date, venue, guest_count, grand_total, currency_code, status,
          created_at, created_by, updated_at, updated_by
        ) VALUES (
          gen_random_uuid(), ${tenantId}::uuid, ${eventNumber}, ${inquiry.relationshipId}::uuid, ${id}::uuid, ${currentPublishedRevision.revisionNumber},
          ${quotation.title}, ${inquiry.eventType}, ${inquiry.eventDate}, ${inquiry.venue}, ${inquiry.guestCount}, ${grandTotal}, ${currencyCode}, 'PLANNING',
          NOW(), ${userId}::uuid, NOW(), ${userId}::uuid
        )
        RETURNING id, event_number as "eventNumber", status
      `;
      const event = eventRows[0];

      await tx.$executeRaw`
        UPDATE cat_quotations
        SET converted_event_id = ${event.id}::uuid, converted_at = NOW(), converted_by = ${userId}::uuid,
            updated_at = NOW(), updated_by = ${userId}::uuid
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;

      return { ok: true as const, event };
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error, eventId: (result as any).eventId, eventNumber: (result as any).eventNumber },
        { status: result.status },
      );
    }

    return NextResponse.json({ success: true, event: result.event });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error converting Quotation to Event:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
