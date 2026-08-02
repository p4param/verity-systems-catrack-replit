import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { readTemplateMenuTree, writeEventMenuTree } from '@/lib/cat/menu-snapshot';

// EM-WP04 — Apply Template to Event.
// Deep-copies a Menu Template's current menu into this Event, fully
// replacing whatever menu the Event currently has (new meal/category/item
// ids throughout). The Event retains no foreign key or other live link
// back to the Template afterward — later edits to either side never
// affect the other. Fully transactional: the replace either completes
// entirely or not at all. Caller (UI) is responsible for the explicit
// confirmation step before calling this.

async function ensureEventInTenant(eventId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id FROM cat_events WHERE id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false LIMIT 1
  `;
  return rows[0] || null;
}

async function ensureTemplateInTenant(templateId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id, template_name as "templateName" FROM cat_menu_templates WHERE id = ${templateId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false LIMIT 1
  `;
  return rows[0] || null;
}

async function fetchMenu(eventId: string, tenantId: string) {
  // Mirrors GET /api/cat/events/{id}/menu's response shape.
  const mealRows: any[] = await prisma.$queryRaw`
    SELECT id, meal_name as "mealName", display_order as "displayOrder" FROM cat_event_meals
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid ORDER BY display_order ASC
  `;
  const categoryRows: any[] = await prisma.$queryRaw`
    SELECT id, meal_id as "mealId", category_name as "categoryName", display_order as "displayOrder" FROM cat_event_menu_categories
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid ORDER BY display_order ASC
  `;
  const itemRows: any[] = await prisma.$queryRaw`
    SELECT id, category_id as "categoryId", item_name as "itemName", quantity, unit, remarks, display_order as "displayOrder" FROM cat_event_menu_items
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid ORDER BY display_order ASC
  `;
  const dietaryRequirements: any[] = await prisma.$queryRaw`
    SELECT id, requirement, guest_count as "guestCount", notes, display_order as "displayOrder" FROM cat_event_dietary_requirements
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid ORDER BY display_order ASC
  `;
  const settingsRows: any[] = await prisma.$queryRaw`
    SELECT service_instructions as "serviceInstructions" FROM cat_event_menu_settings
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid LIMIT 1
  `;

  const itemsByCategory = new Map<string, any[]>();
  for (const item of itemRows) {
    const list = itemsByCategory.get(item.categoryId) || [];
    list.push({ ...item, quantity: item.quantity === null ? undefined : Number(item.quantity) });
    itemsByCategory.set(item.categoryId, list);
  }
  const categoriesByMeal = new Map<string, any[]>();
  for (const category of categoryRows) {
    const list = categoriesByMeal.get(category.mealId) || [];
    list.push({ ...category, items: itemsByCategory.get(category.id) || [] });
    categoriesByMeal.set(category.mealId, list);
  }
  const meals = mealRows.map((meal) => ({ ...meal, categories: categoriesByMeal.get(meal.id) || [] }));

  return { meals, dietaryRequirements, serviceInstructions: settingsRows[0]?.serviceInstructions ?? undefined };
}

export async function POST(req: NextRequest, props: any) {
  try {
    await requirePermission(req, 'CAT_MENU_TEMPLATE_VIEW');
    const user = await requirePermission(req, 'CAT_EVENT_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const event = await ensureEventInTenant(id, tenantId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event record not found' }, { status: 404 });
    }

    const body = await req.json();
    const { templateId } = body as { templateId?: string };
    if (!templateId) {
      return NextResponse.json({ success: false, error: 'templateId is required.' }, { status: 400 });
    }

    const template = await ensureTemplateInTenant(templateId, tenantId);
    if (!template) {
      return NextResponse.json({ success: false, error: 'Menu Template not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const tree = await readTemplateMenuTree(tx, templateId, tenantId);
      await writeEventMenuTree(tx, id, tenantId, userId, tree);
    });

    const menu = await fetchMenu(id, tenantId);
    return NextResponse.json({ success: true, appliedTemplateName: template.templateName, ...menu });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error applying Menu Template to Event:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
