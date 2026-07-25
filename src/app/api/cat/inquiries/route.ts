import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/client';
import { requirePermission } from '@/lib/auth/permission-guard';


export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_INQUIRY_VIEW');
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);

    const query = searchParams.get('query') || '';
    const stage = searchParams.get('stage') || '';
    const eventType = searchParams.get('eventType') || '';
    const salesperson = searchParams.get('salesperson') || '';

    let sql = `
      SELECT 
        i.id,
        i.inquiry_number as "inquiryNumber",
        i.title,
        i.relationship_id as "relationshipId",
        r.name as "relationshipName",
        i.event_type as "eventType",
        i.tentative_event_date as "tentativeEventDate",
        i.expected_guest_count as "expectedGuestCount",
        i.budget_range as "budgetRange",
        i.priority,
        i.inquiry_stage as "inquiryStage",
        i.assigned_salesperson as "assignedSalesperson",
        i.created_at as "createdAt",
        i.updated_at as "updatedAt"
      FROM cat_inquiries i
      LEFT JOIN cat_relationships r ON i.relationship_id = r.id
      WHERE i.tenant_id = $1::uuid AND i.is_deleted = false
    `;

    const params: any[] = [tenantId];
    let idx = 2;

    if (query) {
      sql += ` AND (i.title ILIKE $${idx} OR i.inquiry_number ILIKE $${idx} OR r.name ILIKE $${idx} OR i.assigned_salesperson ILIKE $${idx})`;
      params.push(`%${query}%`);
      idx++;
    }

    if (stage) {
      sql += ` AND i.inquiry_stage = $${idx}`;
      params.push(stage);
      idx++;
    }

    if (eventType) {
      sql += ` AND i.event_type = $${idx}`;
      params.push(eventType);
      idx++;
    }

    if (salesperson) {
      sql += ` AND i.assigned_salesperson = $${idx}`;
      params.push(salesperson);
      idx++;
    }

    sql += ` ORDER BY i.created_at DESC`;

    const inquiries: any[] = await prisma.$queryRawUnsafe(sql, ...params);



    return NextResponse.json({
      success: true,
      items: inquiries,
      total: inquiries.length,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching inquiries:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }

}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_INQUIRY_CREATE');
    const tenantId = user.tenantId;
    const userId = user.id;

    const body = await req.json();

    // Minimal Quick Create input fields + venue indicator (PR-IM-002)
    const {
      relationshipId,
      title,
      eventType,
      tentativeEventDate,
      venue,
      expectedGuestCount,
      assignedSalesperson,
    } = body;

    if (!relationshipId || !title || !eventType) {
      return NextResponse.json(
        { success: false, error: 'Relationship, Title, and Event Type are required.' },
        { status: 400 }
      );
    }

    // Auto-generate Immutable Inquiry Number (AG Revision 1): INQ-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countResult: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM cat_inquiries WHERE tenant_id = ${tenantId}::uuid
    `;
    const seqNumber = (countResult[0]?.count || 0) + 1;
    const inquiryNumber = `INQ-${currentYear}-${String(seqNumber).padStart(4, '0')}`;

    const newId = crypto.randomUUID();
    const now = new Date();
    const parsedDate = tentativeEventDate ? new Date(tentativeEventDate) : null;
    const parsedGuestCount = expectedGuestCount ? parseInt(expectedGuestCount) : null;
    const assignedPerson = assignedSalesperson || 'Sales Team';

    const inserted: any[] = await prisma.$queryRaw`
      INSERT INTO cat_inquiries (
        id,
        tenant_id,
        inquiry_number,
        title,
        relationship_id,
        event_type,
        tentative_event_date,
        venue,
        expected_guest_count,
        priority,
        inquiry_stage,
        assigned_salesperson,
        created_at,
        created_by,
        updated_at,
        updated_by,
        is_deleted
      ) VALUES (
        ${newId}::uuid,
        ${tenantId}::uuid,
        ${inquiryNumber},
        ${title},
        ${relationshipId}::uuid,
        ${eventType},
        ${parsedDate},
        ${venue || null},
        ${parsedGuestCount},
        'MEDIUM',
        'NEW',
        ${assignedPerson},
        ${now},
        ${userId}::uuid,
        ${now},
        ${userId}::uuid,
        false
      ) RETURNING id, inquiry_number as "inquiryNumber", title, inquiry_stage as "inquiryStage"
    `;

    return NextResponse.json({
      success: true,
      inquiry: inserted[0],
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error creating inquiry:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

