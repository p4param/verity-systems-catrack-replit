import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_INQUIRY_VIEW');
    const tenantId = user.tenantId;

    const params = await props.params;
    const { id } = params;

    const records: any[] = await prisma.$queryRaw`
      SELECT 
        i.id,
        i.inquiry_number as "inquiryNumber",
        i.title,
        i.relationship_id as "relationshipId",
        r.name as "relationshipName",
        r.relationship_number as "relationshipNumber",
        i.event_type as "eventType",
        i.tentative_event_date as "tentativeEventDate",
        i.expected_guest_count as "expectedGuestCount",
        i.budget_range as "budgetRange",
        i.priority,
        i.inquiry_stage as "inquiryStage",
        i.assigned_salesperson as "assignedSalesperson",
        i.inquiry_source as "inquirySource",
        i.venue,
        i.service_style as "serviceStyle",
        i.food_preference as "foodPreference",
        i.created_at as "createdAt",
        i.updated_at as "updatedAt"
      FROM cat_inquiries i
      LEFT JOIN cat_relationships r ON i.relationship_id = r.id
      WHERE i.id = ${id}::uuid AND i.tenant_id = ${tenantId}::uuid AND i.is_deleted = false
    `;

    if (!records || records.length === 0) {
      return NextResponse.json({ success: false, error: 'Inquiry record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      inquiry: records[0],
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching inquiry details:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

