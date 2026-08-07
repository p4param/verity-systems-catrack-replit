import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// PM-WP03B — Purchase Order Items — edit quantity / remove. Draft-only.

async function assertDraft(id: string, tenantId: string) {
  const poRows: any[] = await prisma.$queryRaw`
    SELECT id, status FROM cat_purchase_orders WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
  `;
  const po = poRows[0];
  if (!po) return { ok: false as const, status: 404, error: 'Purchase Order not found' };
  if (po.status !== 'DRAFT') return { ok: false as const, status: 409, error: 'Order Items can only be changed while the Purchase Order is Draft.' };
  return { ok: true as const };
}

export async function PUT(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_PURCHASE_ORDER_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id, itemId } = params;

    const body = await req.json();
    const { quantity } = body as { quantity?: number };
    if (!(quantity! > 0)) {
      return NextResponse.json({ success: false, error: 'Quantity must be greater than zero.' }, { status: 400 });
    }

    const draftCheck = await assertDraft(id, tenantId);
    if (!draftCheck.ok) return NextResponse.json({ success: false, error: draftCheck.error }, { status: draftCheck.status });

    const existing: any[] = await prisma.$queryRaw`
      SELECT id FROM cat_purchase_order_items WHERE id = ${itemId}::uuid AND purchase_order_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Purchase Order Item not found' }, { status: 404 });
    }

    await prisma.$executeRaw`
      UPDATE cat_purchase_order_items SET quantity = ${quantity}, updated_at = NOW(), updated_by = ${userId}::uuid
      WHERE id = ${itemId}::uuid AND purchase_order_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error updating Purchase Order Item:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_PURCHASE_ORDER_EDIT');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id, itemId } = params;

    const draftCheck = await assertDraft(id, tenantId);
    if (!draftCheck.ok) return NextResponse.json({ success: false, error: draftCheck.error }, { status: draftCheck.status });

    await prisma.$executeRaw`
      DELETE FROM cat_purchase_order_items WHERE id = ${itemId}::uuid AND purchase_order_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error removing Purchase Order Item:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
