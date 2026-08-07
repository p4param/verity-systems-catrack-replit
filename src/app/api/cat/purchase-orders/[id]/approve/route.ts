import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// PM-WP03B — Purchase Order lifecycle: DRAFT -> APPROVED.
// The single freeze point: Vendor and Order Items both become immutable
// from this moment on. No request body — a pure, server-validated state
// transition, same discipline as POST /api/cat/quotations/[id]/convert
// (row-locked inside a transaction so double-approving from two tabs is
// structurally impossible, not just unlikely).
//
// Every precondition is re-checked here, server-side, even though the
// UI already prevents most of them client-side — Approval is the point
// where a Purchase Order becomes a real commercial commitment, so this
// endpoint does not trust the client:
//   - Vendor must resolve in-tenant and currently be ACTIVE (a Vendor
//     can be blocked/deactivated at any time after the Draft was
//     created, independent of this Purchase Order).
//   - At least one Order Item must exist.
//   - No Order Item may have a non-positive quantity — defense in depth
//     against the invariant every item-write endpoint already enforces
//     at the point of entry (POST/PUT both reject quantity <= 0), not a
//     path that should ever be reachable in practice.

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_PURCHASE_ORDER_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const result = await prisma.$transaction(async (tx) => {
      const poRows: any[] = await tx.$queryRaw`
        SELECT id, status, vendor_id as "vendorId" FROM cat_purchase_orders
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
        FOR UPDATE
      `;
      const po = poRows[0];
      if (!po) return { ok: false as const, status: 404, error: 'Purchase Order not found' };
      if (po.status !== 'DRAFT') {
        return { ok: false as const, status: 409, error: `Only a Draft Purchase Order can be Approved (current status: ${po.status}).` };
      }

      if (!po.vendorId) {
        return { ok: false as const, status: 400, error: 'This Purchase Order has no Vendor — cannot Approve.' };
      }
      const vendorRows: any[] = await tx.$queryRaw`
        SELECT id, status FROM cat_vendors WHERE id = ${po.vendorId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
      `;
      const vendor = vendorRows[0];
      if (!vendor) {
        return { ok: false as const, status: 400, error: 'This Purchase Order\'s Vendor could not be found — cannot Approve.' };
      }
      if (vendor.status !== 'ACTIVE') {
        return { ok: false as const, status: 400, error: `The Vendor is currently ${vendor.status}, not Active — cannot Approve.` };
      }

      const itemCountRows: any[] = await tx.$queryRaw`
        SELECT COUNT(*)::int as count FROM cat_purchase_order_items WHERE purchase_order_id = ${id}::uuid
      `;
      if ((itemCountRows[0]?.count || 0) === 0) {
        return { ok: false as const, status: 400, error: 'A Purchase Order must have at least one Order Item before it can be Approved.' };
      }

      const invalidQtyRows: any[] = await tx.$queryRaw`
        SELECT COUNT(*)::int as count FROM cat_purchase_order_items WHERE purchase_order_id = ${id}::uuid AND quantity <= 0
      `;
      if ((invalidQtyRows[0]?.count || 0) > 0) {
        return { ok: false as const, status: 400, error: 'Every Order Item must have a quantity greater than zero before this Purchase Order can be Approved.' };
      }

      await tx.$executeRaw`
        UPDATE cat_purchase_orders SET
          status = 'APPROVED', approved_at = NOW(), approved_by = ${userId}::uuid,
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
    console.error('Error approving Purchase Order:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
