import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// PM-WP03B — Purchase Order Overview.
// PUT is the Draft-only header edit — today, just Vendor (and optionally
// Work Date). Mirrors the plain-PUT Overview-edit pattern already used
// by PUT /api/cat/vendors/[id], not a Vendor-specific sub-route: Draft-
// only header editing is a general concept, not something that needs
// its own dedicated endpoint per field. Changing Vendor here does NOT
// touch Order Items in any way — no automatic removal, no revalidation
// against the new Vendor's Supply Portfolio. That review is a deliberate
// human responsibility (PM-WP03A Engineering Package, §3).

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_PURCHASE_ORDER_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const rows: any[] = await prisma.$queryRaw`
      SELECT
        po.id, po.po_number as "poNumber", po.origin, po.vendor_id as "vendorId",
        v.name as "vendorName", v.status as "vendorStatus",
        po.work_date::text as "workDate", po.status,
        po.approved_at as "approvedAt", po.issued_at as "issuedAt", po.cancelled_at as "cancelledAt",
        po.created_at as "createdAt", po.updated_at as "updatedAt"
      FROM cat_purchase_orders po
      JOIN cat_vendors v ON v.id = po.vendor_id
      WHERE po.id = ${id}::uuid AND po.tenant_id = ${tenantId}::uuid AND po.is_deleted = false
      LIMIT 1
    `;
    const po = rows[0];
    if (!po) {
      return NextResponse.json({ success: false, error: 'Purchase Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: po });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Purchase Order:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_PURCHASE_ORDER_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const body = await req.json();
    const { vendorId, workDate } = body as { vendorId?: string; workDate?: string | null };

    if (!vendorId) {
      return NextResponse.json({ success: false, error: 'Vendor is required.' }, { status: 400 });
    }

    const poRows: any[] = await prisma.$queryRaw`
      SELECT id, status FROM cat_purchase_orders WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    `;
    const po = poRows[0];
    if (!po) {
      return NextResponse.json({ success: false, error: 'Purchase Order not found' }, { status: 404 });
    }
    if (po.status !== 'DRAFT') {
      return NextResponse.json({ success: false, error: 'Vendor can only be changed while the Purchase Order is Draft.' }, { status: 409 });
    }

    const vendorRows: any[] = await prisma.$queryRaw`
      SELECT id, status FROM cat_vendors WHERE id = ${vendorId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    `;
    const vendor = vendorRows[0];
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Vendor not found.' }, { status: 404 });
    }
    if (vendor.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, error: 'Only an Active Vendor can be selected.' }, { status: 400 });
    }

    await prisma.$executeRaw`
      UPDATE cat_purchase_orders SET
        vendor_id = ${vendorId}::uuid,
        work_date = ${workDate || null}::date,
        updated_at = NOW(), updated_by = ${userId}::uuid
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error updating Purchase Order:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
