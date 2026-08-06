import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// PM-WP01 — Vendor Master, Supply Portfolio tab (Ingredients, V2.0's only
// resource type). A flat, order-independent set — add/remove one link at
// a time, unlike Menu Planning's full-reconcile-on-PUT tree pattern.
// Vendor -> Ingredient links are owned here and will later be read (never
// duplicated) by Purchase Planning.

async function ensureVendorInTenant(vendorId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id FROM cat_vendors WHERE id = ${vendorId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false LIMIT 1
  `;
  return rows[0] || null;
}

async function fetchLinks(vendorId: string, tenantId: string) {
  return prisma.$queryRaw`
    SELECT
      vi.id, vi.ingredient_id as "ingredientId", im.ingredient_code as "ingredientCode", im.name as "ingredientName",
      im.base_unit as "baseUnit", vi.is_preferred as "isPreferred", vi.notes
    FROM cat_vendor_ingredients vi
    JOIN cat_ingredient_master_items im ON im.id = vi.ingredient_id
    WHERE vi.vendor_id = ${vendorId}::uuid AND vi.tenant_id = ${tenantId}::uuid
    ORDER BY im.name ASC
  `;
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_VENDOR_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const vendor = await ensureVendorInTenant(id, tenantId);
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    }

    const items = await fetchLinks(id, tenantId);
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Vendor Supply Portfolio:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_VENDOR_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const vendor = await ensureVendorInTenant(id, tenantId);
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    }

    const body = await req.json();
    const { ingredientId, isPreferred, notes } = body as { ingredientId?: string; isPreferred?: boolean; notes?: string };

    if (!ingredientId) {
      return NextResponse.json({ success: false, error: 'Ingredient is required.' }, { status: 400 });
    }

    const ingredientRows: any[] = await prisma.$queryRaw`
      SELECT id FROM cat_ingredient_master_items WHERE id = ${ingredientId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    `;
    if (ingredientRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Ingredient not found in Ingredient Master.' }, { status: 400 });
    }

    const existing: any[] = await prisma.$queryRaw`
      SELECT id FROM cat_vendor_ingredients WHERE vendor_id = ${id}::uuid AND ingredient_id = ${ingredientId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: 'This Ingredient is already in the Vendor\'s Supply Portfolio.' }, { status: 400 });
    }

    await prisma.$executeRaw`
      INSERT INTO cat_vendor_ingredients (id, tenant_id, vendor_id, ingredient_id, is_preferred, notes, created_at, created_by, updated_at, updated_by)
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${id}::uuid, ${ingredientId}::uuid, ${isPreferred ?? false}, ${notes?.trim() || null}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid)
    `;

    const items = await fetchLinks(id, tenantId);
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error adding to Vendor Supply Portfolio:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
