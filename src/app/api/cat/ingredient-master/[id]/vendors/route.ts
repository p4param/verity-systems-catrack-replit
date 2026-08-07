import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { computeRecommendationHealth, recommendVendor } from '@/modules/cat/vendor-recommendation/domain/vendor-recommendation-engine';
import { VendorLinkRow } from '@/modules/cat/vendor-recommendation/domain/vendor-recommendation-types';

// PM-WP04A — Ingredient Workspace's future Vendor Recommendations tab
// (PM-WP04B) reads from here. Ingredient Workspace owns Priority, but
// NOT the Vendor-Ingredient link itself or its Notes (Vendor Workspace's
// job) — this route is read-only; there is no POST/DELETE here for
// adding or removing a Vendor. Priority is mutated exclusively through
// the five action routes alongside this one.

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_INGREDIENT_MASTER_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const ingRows: any[] = await prisma.$queryRaw`
      SELECT id FROM cat_ingredient_master_items WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    `;
    if (!ingRows[0]) {
      return NextResponse.json({ success: false, error: 'Ingredient not found' }, { status: 404 });
    }

    const rows: any[] = await prisma.$queryRaw`
      SELECT
        vi.id, vi.vendor_id as "vendorId", v.name as "vendorName", v.status,
        v.business_category as "businessCategory", vi.priority, vi.notes
      FROM cat_vendor_ingredients vi
      JOIN cat_vendors v ON v.id = vi.vendor_id AND v.tenant_id = ${tenantId}::uuid AND v.is_deleted = false
      WHERE vi.ingredient_id = ${id}::uuid AND vi.tenant_id = ${tenantId}::uuid
      ORDER BY vi.priority ASC NULLS LAST, v.name ASC
    `;

    const links: VendorLinkRow[] = rows.map((r) => ({
      ingredientId: id,
      vendorId: r.vendorId,
      vendorName: r.vendorName,
      status: r.status,
      businessCategory: r.businessCategory,
      priority: r.priority,
    }));

    const recommendation = recommendVendor(links);
    const health = computeRecommendationHealth(links);

    return NextResponse.json({
      success: true,
      ingredientId: id,
      items: rows,
      recommendation,
      health,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Ingredient Vendor Recommendations:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
