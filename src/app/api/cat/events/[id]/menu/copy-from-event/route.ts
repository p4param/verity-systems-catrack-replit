import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { readEventMenuTree, writeEventMenuTree } from '@/lib/cat/menu-snapshot';

// EM-WP04 — Copy From Existing Event.
// Deep-copies another Event's current menu into this Event, fully
// replacing whatever menu this Event currently has (new meal/category/item
// ids throughout) — a snapshot copy, not a reference; neither Event
// retains any link to the other afterward. Fully transactional. Caller
// (UI) is responsible for the explicit confirmation step before calling
// this.

async function ensureEventInTenant(eventId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id, event_name as "eventName" FROM cat_events WHERE id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false LIMIT 1
  `;
  return rows[0] || null;
}

async function fetchMenu(eventId: string, tenantId: string) {
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
    const user = await requirePermission(req, 'CAT_EVENT_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const targetEvent = await ensureEventInTenant(id, tenantId);
    if (!targetEvent) {
      return NextResponse.json({ success: false, error: 'Event record not found' }, { status: 404 });
    }

    const body = await req.json();
    const { sourceEventId } = body as { sourceEventId?: string };
    if (!sourceEventId) {
      return NextResponse.json({ success: false, error: 'sourceEventId is required.' }, { status: 400 });
    }
    if (sourceEventId === id) {
      return NextResponse.json({ success: false, error: 'Source and target Event must be different.' }, { status: 400 });
    }

    const sourceEvent = await ensureEventInTenant(sourceEventId, tenantId);
    if (!sourceEvent) {
      return NextResponse.json({ success: false, error: 'Source Event not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const tree = await readEventMenuTree(tx, sourceEventId, tenantId);
      await writeEventMenuTree(tx, id, tenantId, userId, tree);
    });

    const menu = await fetchMenu(id, tenantId);
    return NextResponse.json({ success: true, sourceEventName: sourceEvent.eventName, ...menu });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error copying menu from Event:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
