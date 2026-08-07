import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// PM-WP03B — Purchase Order lifecycle: DRAFT/APPROVED -> CANCELLED.
// Deliberately does NOT reach from ISSUED in this work package — per the
// PM-WP03A Engineering Package, cancelling an already-issued PO needs to
// know whether the Vendor has started fulfilling it, information only a
// future Goods Receipt module can honestly provide. No request body.

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_PURCHASE_ORDER_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const result = await prisma.$transaction(async (tx) => {
      const poRows: any[] = await tx.$queryRaw`
        SELECT id, status FROM cat_purchase_orders WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
        FOR UPDATE
      `;
      const po = poRows[0];
      if (!po) return { ok: false as const, status: 404, error: 'Purchase Order not found' };
      if (po.status !== 'DRAFT' && po.status !== 'APPROVED') {
        return { ok: false as const, status: 409, error: `A Purchase Order in ${po.status} status cannot be Cancelled.` };
      }

      await tx.$executeRaw`
        UPDATE cat_purchase_orders SET
          status = 'CANCELLED', cancelled_at = NOW(), cancelled_by = ${userId}::uuid,
          updated_at = NOW(), updated_by = ${userId}::uuid
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;

      return { ok: true as const };
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error cancelling Purchase Order:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
