import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// PM-WP03B — Purchase Order Items (post-save). Draft-only — every write
// here 409s once the parent Purchase Order has left Draft, the single
// freeze point shared with Vendor (see [id]/route.ts).

async function fetchItems(id: string, tenantId: string) {
  return prisma.$queryRaw`
    SELECT id, ingredient_id as "ingredientId", ingredient_code as "ingredientCode", ingredient_name as "ingredientName",
           unit, quantity, source, display_order as "displayOrder"
    FROM cat_purchase_order_items
    WHERE purchase_order_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_PURCHASE_ORDER_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const items = await fetchItems(id, tenantId);
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Purchase Order Items:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_PURCHASE_ORDER_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const body = await req.json();
    const { ingredientId, quantity } = body as { ingredientId?: string; quantity?: number };
    if (!ingredientId || !(quantity! > 0)) {
      return NextResponse.json({ success: false, error: 'Ingredient and a quantity greater than zero are required.' }, { status: 400 });
    }

    const poRows: any[] = await prisma.$queryRaw`
      SELECT id, status FROM cat_purchase_orders WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    `;
    const po = poRows[0];
    if (!po) return NextResponse.json({ success: false, error: 'Purchase Order not found' }, { status: 404 });
    if (po.status !== 'DRAFT') {
      return NextResponse.json({ success: false, error: 'Items can only be added while the Purchase Order is Draft.' }, { status: 409 });
    }

    const ingRows: any[] = await prisma.$queryRaw`
      SELECT ingredient_code as "code", name, base_unit as "unit"
      FROM cat_ingredient_master_items
      WHERE id = ${ingredientId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    `;
    const ing = ingRows[0];
    if (!ing) return NextResponse.json({ success: false, error: 'Ingredient not found in Ingredient Master.' }, { status: 400 });

    const existing: any[] = await prisma.$queryRaw`
      SELECT id FROM cat_purchase_order_items WHERE purchase_order_id = ${id}::uuid AND ingredient_id = ${ingredientId}::uuid
    `;
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: 'This Ingredient is already on this Purchase Order.' }, { status: 400 });
    }

    const maxOrderRows: any[] = await prisma.$queryRaw`
      SELECT COALESCE(MAX(display_order), -1)::int as "maxOrder" FROM cat_purchase_order_items WHERE purchase_order_id = ${id}::uuid
    `;
    const nextOrder = (maxOrderRows[0]?.maxOrder ?? -1) + 1;

    await prisma.$executeRaw`
      INSERT INTO cat_purchase_order_items (
        id, tenant_id, purchase_order_id, ingredient_id, ingredient_code, ingredient_name, unit, quantity, source, display_order,
        created_at, created_by, updated_at, updated_by
      ) VALUES (
        gen_random_uuid(), ${tenantId}::uuid, ${id}::uuid, ${ingredientId}::uuid, ${ing.code}, ${ing.name}, ${ing.unit || ''}, ${quantity}, 'MANUAL', ${nextOrder},
        NOW(), ${userId}::uuid, NOW(), ${userId}::uuid
      )
    `;

    const items = await fetchItems(id, tenantId);
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error adding Purchase Order Item:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
