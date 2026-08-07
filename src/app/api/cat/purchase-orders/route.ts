import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// PM-WP03B — Purchase Order Management.
// A Purchase Order is a persisted commercial commitment, not a logistics
// document — the first entity in the Sales -> Operations -> Procurement
// chain that is not recomputed on every request. Directory list mirrors
// the established CAT pattern (incrementally-built raw SQL, { success,
// items }, KPIs computed client-side from the returned items — same as
// Vendor Master's Directory).
//
// POST creates a Draft from either origin ('PLANNING' or 'MANUAL') — the
// same endpoint serves both, since structurally a Draft is a Draft
// regardless of how it began; origin is just provenance metadata. items
// may be an empty array (a Manual Draft can be saved with nothing on it
// yet and built up afterward via the item endpoints) — only /approve
// requires at least one item. ingredient_code/name/unit are always
// re-derived server-side from Ingredient Master at insert time; the
// client-supplied labels in Purchase Order Review are never trusted.

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_PURCHASE_ORDER_VIEW');
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const status = searchParams.get('status') || '';
    const vendorId = searchParams.get('vendorId') || '';
    const origin = searchParams.get('origin') || '';

    let sql = `
      SELECT
        po.id,
        po.po_number as "poNumber",
        po.origin,
        po.vendor_id as "vendorId",
        v.name as "vendorName",
        po.work_date::text as "workDate",
        po.status,
        COALESCE(poi.item_count, 0)::int as "itemCount",
        po.created_at as "createdAt",
        po.updated_at as "updatedAt"
      FROM cat_purchase_orders po
      JOIN cat_vendors v ON v.id = po.vendor_id
      LEFT JOIN (
        SELECT purchase_order_id, COUNT(*)::int as item_count FROM cat_purchase_order_items GROUP BY purchase_order_id
      ) poi ON poi.purchase_order_id = po.id
      WHERE po.tenant_id = $1::uuid AND po.is_deleted = false
    `;
    const params: any[] = [tenantId];
    let idx = 2;

    if (query) {
      sql += ` AND (po.po_number ILIKE $${idx} OR v.name ILIKE $${idx})`;
      params.push(`%${query}%`);
      idx++;
    }
    if (status) {
      sql += ` AND po.status = $${idx}`;
      params.push(status);
      idx++;
    }
    if (vendorId) {
      sql += ` AND po.vendor_id = $${idx}::uuid`;
      params.push(vendorId);
      idx++;
    }
    if (origin) {
      sql += ` AND po.origin = $${idx}`;
      params.push(origin);
      idx++;
    }

    sql += ` ORDER BY po.created_at DESC`;

    const items: any[] = await prisma.$queryRawUnsafe(sql, ...params);

    return NextResponse.json({ success: true, items, total: items.length });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Purchase Orders:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_PURCHASE_ORDER_CREATE');
    const tenantId = user.tenantId;
    const userId = user.id;

    const body = await req.json();
    const { vendorId, workDate, origin, items } = body as {
      vendorId?: string;
      workDate?: string;
      origin?: string;
      items?: { ingredientId: string; quantity: number; source?: string }[];
    };

    if (!vendorId) {
      return NextResponse.json({ success: false, error: 'Vendor is required.' }, { status: 400 });
    }
    if (origin !== 'PLANNING' && origin !== 'MANUAL') {
      return NextResponse.json({ success: false, error: 'Origin must be PLANNING or MANUAL.' }, { status: 400 });
    }
    const itemInputs = items || [];
    for (const item of itemInputs) {
      if (!item.ingredientId || !(item.quantity > 0)) {
        return NextResponse.json({ success: false, error: 'Every item requires an Ingredient and a quantity greater than zero.' }, { status: 400 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const vendorRows: any[] = await tx.$queryRaw`
        SELECT id, status FROM cat_vendors WHERE id = ${vendorId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
      `;
      const vendor = vendorRows[0];
      if (!vendor) {
        return { ok: false as const, status: 404, error: 'Vendor not found.' };
      }
      if (vendor.status !== 'ACTIVE') {
        return { ok: false as const, status: 400, error: 'Only an Active Vendor can be selected for a new Purchase Order.' };
      }

      // Re-derive ingredient_code/name/unit server-side — the client's
      // display labels in Purchase Order Review are never trusted.
      const resolvedItems: { ingredientId: string; code: string; name: string; unit: string; quantity: number; source: string }[] = [];
      for (const item of itemInputs) {
        const ingRows: any[] = await tx.$queryRaw`
          SELECT ingredient_code as "code", name, base_unit as "unit"
          FROM cat_ingredient_master_items
          WHERE id = ${item.ingredientId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
        `;
        const ing = ingRows[0];
        if (!ing) {
          return { ok: false as const, status: 400, error: `Ingredient ${item.ingredientId} could not be found in Ingredient Master.` };
        }
        resolvedItems.push({
          ingredientId: item.ingredientId,
          code: ing.code,
          name: ing.name,
          unit: ing.unit || '',
          quantity: item.quantity,
          source: item.source === 'MANUAL' ? 'MANUAL' : 'PLANNING',
        });
      }

      const currentYear = new Date().getFullYear();
      const countRows: any[] = await tx.$queryRaw`
        SELECT COUNT(*)::int as count FROM cat_purchase_orders WHERE tenant_id = ${tenantId}::uuid
      `;
      const seqNumber = (countRows[0]?.count || 0) + 1;
      const poNumber = `PO-${currentYear}-${String(seqNumber).padStart(6, '0')}`;

      const poRows: any[] = await tx.$queryRaw`
        INSERT INTO cat_purchase_orders (
          id, tenant_id, po_number, origin, vendor_id, work_date, status,
          created_at, created_by, updated_at, updated_by
        ) VALUES (
          gen_random_uuid(), ${tenantId}::uuid, ${poNumber}, ${origin}, ${vendorId}::uuid, ${workDate || null}::date, 'DRAFT',
          NOW(), ${userId}::uuid, NOW(), ${userId}::uuid
        )
        RETURNING id, po_number as "poNumber"
      `;
      const po = poRows[0];

      let displayOrder = 0;
      for (const item of resolvedItems) {
        await tx.$executeRaw`
          INSERT INTO cat_purchase_order_items (
            id, tenant_id, purchase_order_id, ingredient_id, ingredient_code, ingredient_name, unit, quantity, source, display_order,
            created_at, created_by, updated_at, updated_by
          ) VALUES (
            gen_random_uuid(), ${tenantId}::uuid, ${po.id}::uuid, ${item.ingredientId}::uuid, ${item.code}, ${item.name}, ${item.unit}, ${item.quantity}, ${item.source}, ${displayOrder},
            NOW(), ${userId}::uuid, NOW(), ${userId}::uuid
          )
        `;
        displayOrder++;
      }

      return { ok: true as const, id: po.id, poNumber: po.poNumber };
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, id: result.id, poNumber: result.poNumber });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error creating Purchase Order:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
