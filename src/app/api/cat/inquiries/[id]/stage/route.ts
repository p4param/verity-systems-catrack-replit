import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// Stage transition state machine rules (AG Revision 4)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NEW: ['DISCOVERY', 'QUALIFIED', 'LOST', 'ON_HOLD', 'CANCELLED'],
  DISCOVERY: ['QUALIFIED', 'QUOTATION_REQUESTED', 'LOST', 'ON_HOLD', 'CANCELLED'],
  QUALIFIED: ['QUOTATION_REQUESTED', 'QUOTATION_SUBMITTED', 'LOST', 'ON_HOLD', 'CANCELLED'],
  QUOTATION_REQUESTED: ['QUOTATION_SUBMITTED', 'NEGOTIATION', 'LOST', 'ON_HOLD', 'CANCELLED'],
  QUOTATION_SUBMITTED: ['NEGOTIATION', 'WON', 'LOST', 'ON_HOLD', 'CANCELLED'],
  NEGOTIATION: ['WON', 'LOST', 'ON_HOLD', 'CANCELLED'],
  WON: ['BOOKED', 'CANCELLED'],
  BOOKED: ['CANCELLED'],
  LOST: ['NEW', 'DISCOVERY'],
  ON_HOLD: ['NEW', 'DISCOVERY', 'QUALIFIED'],
  CANCELLED: ['NEW', 'DISCOVERY'],
};

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_INQUIRY_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;

    const params = await props.params;
    const { id } = params;
    const body = await req.json();
    const { targetStage } = body;

    if (!targetStage) {
      return NextResponse.json({ success: false, error: 'targetStage is required' }, { status: 400 });
    }

    const records: any[] = await prisma.$queryRaw`
      SELECT id, inquiry_stage as "inquiryStage"
      FROM cat_inquiries
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    `;

    if (!records || records.length === 0) {
      return NextResponse.json({ success: false, error: 'Inquiry record not found' }, { status: 404 });
    }

    const currentStage = records[0].inquiryStage;

    // Validate allowed transitions (AG Revision 4)
    const allowed = ALLOWED_TRANSITIONS[currentStage] || [];
    if (currentStage !== targetStage && !allowed.includes(targetStage)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid stage transition from "${currentStage}" to "${targetStage}". Allowed transitions: ${allowed.join(', ')}.`,
        },
        { status: 422 }
      );
    }

    const now = new Date();

    const updated: any[] = await prisma.$queryRaw`
      UPDATE cat_inquiries
      SET inquiry_stage = ${targetStage}, updated_at = ${now}, updated_by = ${userId}::uuid
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      RETURNING id, inquiry_stage as "inquiryStage", updated_at as "updatedAt"
    `;

    return NextResponse.json({
      success: true,
      inquiry: updated[0],
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error updating inquiry stage:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

