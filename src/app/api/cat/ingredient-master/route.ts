import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// EM-WP07 — Ingredient Master Directory. EM-WP08 — also used as the
// lookup source for Recipe Ingredients. Not connected to Procurement or
// Inventory. Mirrors the established CAT directory list pattern
// (incrementally-built raw SQL, no pagination, { success, items, total }).

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_INGREDIENT_MASTER_VIEW');
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const ingredientType = searchParams.get('ingredientType') || '';
    const procurementCategory = searchParams.get('procurementCategory') || '';
    const status = searchParams.get('status') || '';
    const sort = searchParams.get('sort') || 'name_asc';

    let sql = `
      SELECT
        id,
        ingredient_code as "ingredientCode",
        name,
        ingredient_type as "ingredientType",
        base_unit as "baseUnit",
        storage,
        procurement_category as "procurementCategory",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM cat_ingredient_master_items
      WHERE tenant_id = $1::uuid AND is_deleted = false
    `;
    const params: any[] = [tenantId];
    let idx = 2;

    if (query) {
      sql += ` AND (name ILIKE $${idx} OR ingredient_code ILIKE $${idx} OR ingredient_type ILIKE $${idx} OR procurement_category ILIKE $${idx})`;
      params.push(`%${query}%`);
      idx++;
    }
    if (ingredientType) {
      sql += ` AND ingredient_type = $${idx}`;
      params.push(ingredientType);
      idx++;
    }
    if (procurementCategory) {
      sql += ` AND procurement_category = $${idx}`;
      params.push(procurementCategory);
      idx++;
    }
    if (status) {
      sql += ` AND status = $${idx}`;
      params.push(status);
      idx++;
    }

    const SORT_COLUMNS: Record<string, string> = {
      name_asc: 'name ASC',
      name_desc: 'name DESC',
      created_desc: 'created_at DESC',
      updated_desc: 'updated_at DESC',
    };
    sql += ` ORDER BY ${SORT_COLUMNS[sort] || SORT_COLUMNS.name_asc}`;

    const items: any[] = await prisma.$queryRawUnsafe(sql, ...params);

    return NextResponse.json({ success: true, items, total: items.length });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Ingredient Master:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_INGREDIENT_MASTER_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;

    const body = await req.json();
    const { name, ingredientType, baseUnit, procurementCategory } = body as {
      name?: string;
      ingredientType?: string;
      baseUnit?: string;
      procurementCategory?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required.' }, { status: 400 });
    }

    // Auto-generate immutable Ingredient Code: ING-YYYY-XXXX, matching the
    // established {PREFIX}-{YEAR}-{padded sequence} convention.
    const currentYear = new Date().getFullYear();
    const countResult: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM cat_ingredient_master_items WHERE tenant_id = ${tenantId}::uuid
    `;
    const seqNumber = (countResult[0]?.count || 0) + 1;
    const ingredientCode = `ING-${currentYear}-${String(seqNumber).padStart(4, '0')}`;

    const rows: any[] = await prisma.$queryRaw`
      INSERT INTO cat_ingredient_master_items (
        id, tenant_id, ingredient_code, name, ingredient_type, base_unit, procurement_category, status,
        created_at, created_by, updated_at, updated_by, is_deleted
      ) VALUES (
        gen_random_uuid(), ${tenantId}::uuid, ${ingredientCode}, ${name.trim()}, ${ingredientType?.trim() || null}, ${baseUnit?.trim() || null},
        ${procurementCategory?.trim() || null}, 'ACTIVE', NOW(), ${userId}::uuid, NOW(), ${userId}::uuid, false
      )
      RETURNING id, ingredient_code as "ingredientCode", name
    `;

    return NextResponse.json({ success: true, item: rows[0] });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error creating Ingredient Master item:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
