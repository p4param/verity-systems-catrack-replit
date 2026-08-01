import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// QM-WP04E — Event Conversion.
// Minimal, read-only Event fetch — just enough to back the "Open Event"
// destination and the post-conversion audit view. No planning, menu,
// procurement, kitchen, billing, contract, portal, or e-signature data;
// this Work Package ends at Event creation. GET only — no PATCH/PUT/DELETE.

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_EVENT_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const rows: any[] = await prisma.$queryRaw`
      SELECT
        e.id,
        e.event_number as "eventNumber",
        e.event_name as "eventName",
        e.status,
        e.relationship_id as "relationshipId",
        r.name as "relationshipName",
        e.event_type as "eventType",
        e.event_date as "eventDate",
        e.venue,
        e.guest_count as "guestCount",
        e.grand_total as "grandTotal",
        e.currency_code as "currencyCode",
        e.origin_quotation_id as "originQuotationId",
        q.quotation_number as "originQuotationNumber",
        e.origin_quotation_revision as "originQuotationRevision",
        e.created_at as "createdAt"
      FROM cat_events e
      JOIN cat_relationships r ON r.id = e.relationship_id
      JOIN cat_quotations q ON q.id = e.origin_quotation_id
      WHERE e.id = ${id}::uuid AND e.tenant_id = ${tenantId}::uuid AND e.is_deleted = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ success: false, error: 'Event record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      event: {
        id: row.id,
        eventNumber: row.eventNumber,
        eventName: row.eventName,
        status: row.status,
        relationshipId: row.relationshipId,
        relationshipName: row.relationshipName,
        eventType: row.eventType,
        eventDate: row.eventDate,
        venue: row.venue,
        guestCount: row.guestCount,
        grandTotal: row.grandTotal === null ? undefined : Number(row.grandTotal),
        currencyCode: row.currencyCode,
        originQuotationId: row.originQuotationId,
        originQuotationNumber: row.originQuotationNumber,
        originQuotationRevision: row.originQuotationRevision,
        createdAt: row.createdAt,
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Event:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
