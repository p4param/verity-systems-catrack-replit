import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// EM-WP05 — Menu Catalog Directory.
// Reusable master data, independent of Events and Menu Templates. Mirrors
// the established CAT directory list pattern (incrementally-built raw SQL,
// no pagination, { success, items, total }).

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_MENU_CATALOG_VIEW');
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const category = searchParams.get('category') || '';
    const cuisine = searchParams.get('cuisine') || '';
    const dietaryType = searchParams.get('dietaryType') || '';
    const status = searchParams.get('status') || '';
    const sort = searchParams.get('sort') || 'name_asc';

    let sql = `
      SELECT
        id,
        name,
        category,
        cuisine,
        dietary_type as "dietaryType",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM cat_menu_catalog_items
      WHERE tenant_id = $1::uuid AND is_deleted = false
    `;
    const params: any[] = [tenantId];
    let idx = 2;

    if (query) {
      sql += ` AND (name ILIKE $${idx} OR category ILIKE $${idx} OR cuisine ILIKE $${idx})`;
      params.push(`%${query}%`);
      idx++;
    }
    if (category) {
      sql += ` AND category = $${idx}`;
      params.push(category);
      idx++;
    }
    if (cuisine) {
      sql += ` AND cuisine = $${idx}`;
      params.push(cuisine);
      idx++;
    }
    if (dietaryType) {
      sql += ` AND dietary_type = $${idx}`;
      params.push(dietaryType);
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
    console.error('Error fetching Menu Catalog:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_MENU_CATALOG_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;

    const body = await req.json();
    const { name, category, cuisine, dietaryType } = body as {
      name?: string;
      category?: string;
      cuisine?: string;
      dietaryType?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required.' }, { status: 400 });
    }

    const rows: any[] = await prisma.$queryRaw`
      INSERT INTO cat_menu_catalog_items (
        id, tenant_id, name, category, cuisine, dietary_type, status,
        created_at, created_by, updated_at, updated_by, is_deleted
      ) VALUES (
        gen_random_uuid(), ${tenantId}::uuid, ${name.trim()}, ${category?.trim() || null}, ${cuisine?.trim() || null},
        ${dietaryType?.trim() || 'VEG'}, 'ACTIVE', NOW(), ${userId}::uuid, NOW(), ${userId}::uuid, false
      )
      RETURNING id, name
    `;

    return NextResponse.json({ success: true, item: rows[0] });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error creating Menu Catalog item:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
