import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { renumberAfterLinkRemoval } from '@/modules/cat/vendor-recommendation/domain/vendor-recommendation-operations';

// PM-WP01 — Vendor Master, Supply Portfolio tab. Update Notes or remove
// a single Vendor -> Ingredient link.
//
// PM-WP04A — ownership split, enforced here, not just in the UI: PUT
// only ever accepts and writes `notes`. If a caller sends `priority` or
// `isPreferred`, that is rejected outright (400) rather than silently
// ignored — Priority may only be changed through the Ingredient
// Workspace's five domain operations. DELETE now closes any ranking gap
// the removed link leaves behind, in the same transaction as the
// deletion, reusing the identical renumbering logic Remove From Ranking
// uses.

export async function PUT(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_VENDOR_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id, ingredientId } = params;

    const body = await req.json();
    if ('priority' in body || 'isPreferred' in body) {
      return NextResponse.json(
        { success: false, error: 'Priority can only be changed from the Ingredient Workspace, not from Vendor Master.' },
        { status: 400 },
      );
    }
    const { notes } = body as { notes?: string };

    const existing: any[] = await prisma.$queryRaw`
      SELECT id FROM cat_vendor_ingredients WHERE vendor_id = ${id}::uuid AND ingredient_id = ${ingredientId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Supply Portfolio entry not found' }, { status: 404 });
    }

    await prisma.$executeRaw`
      UPDATE cat_vendor_ingredients SET
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
    const userId = user.id;
    const params = await props.params;
    const { id, ingredientId } = params;

    await prisma.$transaction(async (tx) => {
      const rows: any[] = await tx.$queryRaw`
        SELECT id FROM cat_vendor_ingredients WHERE vendor_id = ${id}::uuid AND ingredient_id = ${ingredientId}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const link = rows[0];
      if (!link) return;

      await tx.$executeRaw`
        DELETE FROM cat_vendor_ingredients WHERE id = ${link.id}::uuid
      `;
      await renumberAfterLinkRemoval(tx, tenantId, userId, ingredientId, link.id);
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error removing Vendor Supply Portfolio entry:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
