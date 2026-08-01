import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// EM-WP01 — Event Foundation.
// Events Directory list endpoint. Mirrors GET /api/cat/quotations's pattern
// (incrementally-built raw SQL, no pagination). GET only — Events are
// never created directly, only via Quotation Conversion (QM-WP04E).

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_EVENT_VIEW');
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const status = searchParams.get('status') || '';
    const relationshipId = searchParams.get('relationshipId') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const sort = searchParams.get('sort') || 'created_desc';

    let sql = `
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
      WHERE e.tenant_id = $1::uuid AND e.is_deleted = false
    `;

    const params: any[] = [tenantId];
    let idx = 2;

    if (query) {
      sql += ` AND (e.event_name ILIKE $${idx} OR e.event_number ILIKE $${idx} OR r.name ILIKE $${idx} OR q.quotation_number ILIKE $${idx})`;
      params.push(`%${query}%`);
      idx++;
    }

    if (status) {
      sql += ` AND e.status = $${idx}`;
      params.push(status);
      idx++;
    }

    if (relationshipId) {
      sql += ` AND e.relationship_id = $${idx}::uuid`;
      params.push(relationshipId);
      idx++;
    }

    if (dateFrom) {
      sql += ` AND e.event_date >= $${idx}::timestamptz`;
      params.push(new Date(dateFrom));
      idx++;
    }

    if (dateTo) {
      sql += ` AND e.event_date <= $${idx}::timestamptz`;
      params.push(new Date(dateTo));
      idx++;
    }

    const SORT_COLUMNS: Record<string, string> = {
      created_desc: 'e.created_at DESC',
      created_asc: 'e.created_at ASC',
      event_date_asc: 'e.event_date ASC NULLS LAST',
      event_date_desc: 'e.event_date DESC NULLS LAST',
      name_asc: 'e.event_name ASC',
    };
    sql += ` ORDER BY ${SORT_COLUMNS[sort] || SORT_COLUMNS.created_desc}`;

    const rows: any[] = await prisma.$queryRawUnsafe(sql, ...params);

    const items = rows.map((row) => ({
      ...row,
      grandTotal: row.grandTotal === null ? undefined : Number(row.grandTotal),
    }));

    return NextResponse.json({
      success: true,
      items,
      total: items.length,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Events:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
