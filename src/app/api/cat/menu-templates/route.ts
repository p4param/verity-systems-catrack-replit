import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// EM-WP04 — Menu Templates Directory.
// Menu Templates are first-class business entities — their own Directory,
// listing every Template with computed counts (no client-side aggregation
// needed since these come from a straightforward grouped count, unlike the
// hand-rolled KPI convention used elsewhere in this app). No pagination,
// matching every other CAT directory list endpoint.

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_MENU_TEMPLATE_VIEW');
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';

    let sql = `
      SELECT
        t.id,
        t.template_name as "templateName",
        t.description,
        t.created_at as "createdAt",
        t.updated_at as "updatedAt",
        COALESCE(meal_counts.total_meals, 0)::int as "totalMeals",
        COALESCE(cat_counts.total_categories, 0)::int as "totalCategories",
        COALESCE(item_counts.total_items, 0)::int as "totalItems",
        COALESCE(dietary_counts.total_dietary, 0)::int as "dietaryCount"
      FROM cat_menu_templates t
      LEFT JOIN (SELECT template_id, COUNT(*) as total_meals FROM cat_menu_template_meals GROUP BY template_id) meal_counts
        ON meal_counts.template_id = t.id
      LEFT JOIN (SELECT template_id, COUNT(*) as total_categories FROM cat_menu_template_categories GROUP BY template_id) cat_counts
        ON cat_counts.template_id = t.id
      LEFT JOIN (SELECT template_id, COUNT(*) as total_items FROM cat_menu_template_items GROUP BY template_id) item_counts
        ON item_counts.template_id = t.id
      LEFT JOIN (SELECT template_id, COUNT(*) as total_dietary FROM cat_menu_template_dietary_requirements GROUP BY template_id) dietary_counts
        ON dietary_counts.template_id = t.id
      WHERE t.tenant_id = $1::uuid AND t.is_deleted = false
    `;
    const params: any[] = [tenantId];

    if (query) {
      sql += ` AND (t.template_name ILIKE $2 OR t.description ILIKE $2)`;
      params.push(`%${query}%`);
    }

    sql += ` ORDER BY t.updated_at DESC`;

    const items: any[] = await prisma.$queryRawUnsafe(sql, ...params);

    return NextResponse.json({ success: true, items, total: items.length });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Menu Templates:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_MENU_TEMPLATE_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;

    const body = await req.json();
    const { templateName, description } = body as { templateName?: string; description?: string };

    if (!templateName?.trim()) {
      return NextResponse.json({ success: false, error: 'Template Name is required.' }, { status: 400 });
    }

    const rows: any[] = await prisma.$queryRaw`
      INSERT INTO cat_menu_templates (id, tenant_id, template_name, description, created_at, created_by, updated_at, updated_by, is_deleted)
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${templateName.trim()}, ${description?.trim() || null}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid, false)
      RETURNING id, template_name as "templateName", description
    `;

    return NextResponse.json({ success: true, template: rows[0] });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error creating Menu Template:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
