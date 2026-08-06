import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// PM-WP01 — Vendor Master, Supply Portfolio tab. Update (preferred flag /
// notes) or remove a single Vendor -> Ingredient link.

export async function PUT(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_VENDOR_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id, ingredientId } = params;

    const body = await req.json();
    const { isPreferred, notes } = body as { isPreferred?: boolean; notes?: string };

    const existing: any[] = await prisma.$queryRaw`
      SELECT id FROM cat_vendor_ingredients WHERE vendor_id = ${id}::uuid AND ingredient_id = ${ingredientId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Supply Portfolio entry not found' }, { status: 404 });
    }

    await prisma.$executeRaw`
      UPDATE cat_vendor_ingredients SET
        is_preferred = ${isPreferred ?? false},
        notes = ${notes?.trim() || null},
        updated_at = NOW(),
        updated_by = ${userId}::uuid
      WHERE vendor_id = ${id}::uuid AND ingredient_id = ${ingredientId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error updating Vendor Supply Portfolio entry:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_VENDOR_EDIT');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id, ingredientId } = params;

    await prisma.$executeRaw`
      DELETE FROM cat_vendor_ingredients WHERE vendor_id = ${id}::uuid AND ingredient_id = ${ingredientId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error removing Vendor Supply Portfolio entry:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
