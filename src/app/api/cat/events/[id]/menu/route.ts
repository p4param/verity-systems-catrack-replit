import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// EM-WP03 — Menu Planning.
// Single GET/PUT pair for the entire menu tree (Meals -> Categories ->
// Menu Items), Dietary Requirements, and Service Instructions. No status,
// revision, workflow, or approval semantics — PUT always reconciles the
// full current state of every level in one transaction (Collection
// Authoring Pattern, same convention as EM-WP02's Planning endpoint).

interface EventMenuItemInput {
  id: string;
  itemName: string;
  quantity?: number;
  unit?: string;
  remarks?: string;
  catalogItemId?: string | null;
  recipeVariantId?: string | null;
}

interface EventMenuCategoryInput {
  id: string;
  categoryName: string;
  items: EventMenuItemInput[];
}

interface EventMealInput {
  id: string;
  mealName: string;
  categories: EventMenuCategoryInput[];
}

interface EventDietaryRequirementInput {
  id: string;
  requirement: string;
  guestCount?: number;
  notes?: string;
}

async function ensureEventInTenant(eventId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id FROM cat_events
    WHERE id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] || null;
}

async function fetchMenu(eventId: string, tenantId: string) {
  const mealRows: any[] = await prisma.$queryRaw`
    SELECT id, meal_name as "mealName", display_order as "displayOrder"
    FROM cat_event_meals
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  const categoryRows: any[] = await prisma.$queryRaw`
    SELECT id, meal_id as "mealId", category_name as "categoryName", display_order as "displayOrder"
    FROM cat_event_menu_categories
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  const itemRows: any[] = await prisma.$queryRaw`
    SELECT id, category_id as "categoryId", item_name as "itemName", quantity, unit, remarks, display_order as "displayOrder",
           catalog_item_id as "catalogItemId", recipe_variant_id as "recipeVariantId"
    FROM cat_event_menu_items
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  const dietaryRequirements: any[] = await prisma.$queryRaw`
    SELECT id, requirement, guest_count as "guestCount", notes, display_order as "displayOrder"
    FROM cat_event_dietary_requirements
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  const settingsRows: any[] = await prisma.$queryRaw`
    SELECT service_instructions as "serviceInstructions"
    FROM cat_event_menu_settings
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid
    LIMIT 1
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

  return {
    meals,
    dietaryRequirements,
    serviceInstructions: settingsRows[0]?.serviceInstructions ?? undefined,
  };
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_EVENT_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const event = await ensureEventInTenant(id, tenantId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event record not found' }, { status: 404 });
    }

    const menu = await fetchMenu(id, tenantId);
    return NextResponse.json({ success: true, ...menu });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Event Menu:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, props: any) {
  try {
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
    const {
      meals,
      dietaryRequirements,
      serviceInstructions,
    }: {
      meals?: EventMealInput[];
      dietaryRequirements?: EventDietaryRequirementInput[];
      serviceInstructions?: string;
    } = body;

    const incomingMeals = Array.isArray(meals) ? meals : [];
    const incomingDietary = Array.isArray(dietaryRequirements) ? dietaryRequirements : [];

    for (const meal of incomingMeals) {
      if (!meal.mealName?.trim()) {
        return NextResponse.json({ success: false, error: 'Meal Name is required for every Meal.' }, { status: 400 });
      }
      for (const category of meal.categories || []) {
        if (!category.categoryName?.trim()) {
          return NextResponse.json({ success: false, error: 'Category Name is required for every Category.' }, { status: 400 });
        }
        for (const item of category.items || []) {
          if (!item.itemName?.trim()) {
            return NextResponse.json({ success: false, error: 'Item Name is required for every Menu Item.' }, { status: 400 });
          }
        }
      }
    }
    for (const req of incomingDietary) {
      if (!req.requirement?.trim()) {
        return NextResponse.json({ success: false, error: 'Requirement is required for every Dietary Requirement.' }, { status: 400 });
      }
    }

    // EM-WP09 — Recipe Scaling: every referenced Recipe Variant must exist,
    // belong to this tenant, and belong to the exact Catalog item the Menu
    // Item claims — checked up front for a clean 400, same pattern as the
    // Ingredient Master check in the Recipe Management PUT handler.
    const allItems = incomingMeals.flatMap((m) => (m.categories || []).flatMap((c) => c.items || []));
    const referencedVariantIds = [...new Set(allItems.filter((i) => i.recipeVariantId).map((i) => i.recipeVariantId as string))];
    if (referencedVariantIds.length > 0) {
      const validVariants: Array<{ id: string; catalogItemId: string }> = await prisma.$queryRaw`
        SELECT id, catalog_item_id as "catalogItemId" FROM cat_menu_catalog_recipe_variants
        WHERE tenant_id = ${tenantId}::uuid AND id = ANY(${referencedVariantIds}::uuid[])
      `;
      const catalogItemIdByVariantId = new Map(validVariants.map((v) => [v.id, v.catalogItemId]));
      for (const item of allItems) {
        if (!item.recipeVariantId) continue;
        const owningCatalogItemId = catalogItemIdByVariantId.get(item.recipeVariantId);
        if (!owningCatalogItemId) {
          return NextResponse.json({ success: false, error: 'One or more selected Recipe Variants were not found.' }, { status: 400 });
        }
        if (!item.catalogItemId || item.catalogItemId !== owningCatalogItemId) {
          return NextResponse.json({ success: false, error: 'A selected Recipe Variant does not belong to its Menu Item\'s Catalog item.' }, { status: 400 });
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Meals — delete removed (cascades categories + items), then upsert.
      const existingMeals: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_event_meals WHERE event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingMealIds = new Set(incomingMeals.map((m) => m.id));
      for (const row of existingMeals) {
        if (!incomingMealIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_event_meals WHERE id = ${row.id}::uuid AND event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }

      // 2. Categories — delete removed (cascades items), across the whole event.
      const existingCategories: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_event_menu_categories WHERE event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingCategoryIds = new Set(incomingMeals.flatMap((m) => (m.categories || []).map((c) => c.id)));
      for (const row of existingCategories) {
        if (!incomingCategoryIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_event_menu_categories WHERE id = ${row.id}::uuid AND event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }

      // 3. Menu Items — delete removed, across the whole event.
      const existingItems: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_event_menu_items WHERE event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingItemIds = new Set(
        incomingMeals.flatMap((m) => (m.categories || []).flatMap((c) => (c.items || []).map((i) => i.id))),
      );
      for (const row of existingItems) {
        if (!incomingItemIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_event_menu_items WHERE id = ${row.id}::uuid AND event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }

      // 4. Upsert Meals -> Categories -> Items, in nested display order.
      for (let mealIndex = 0; mealIndex < incomingMeals.length; mealIndex++) {
        const meal = incomingMeals[mealIndex];
        await tx.$executeRaw`
          INSERT INTO cat_event_meals (id, tenant_id, event_id, meal_name, display_order, created_at, created_by, updated_at, updated_by)
          VALUES (${meal.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${meal.mealName.trim()}, ${mealIndex}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid)
          ON CONFLICT (id) DO UPDATE SET
            meal_name = EXCLUDED.meal_name,
            display_order = EXCLUDED.display_order,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
          WHERE cat_event_meals.event_id = EXCLUDED.event_id AND cat_event_meals.tenant_id = EXCLUDED.tenant_id
        `;

        const categories = meal.categories || [];
        for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
          const category = categories[categoryIndex];
          await tx.$executeRaw`
            INSERT INTO cat_event_menu_categories (id, tenant_id, event_id, meal_id, category_name, display_order, created_at, created_by, updated_at, updated_by)
            VALUES (${category.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${meal.id}::uuid, ${category.categoryName.trim()}, ${categoryIndex}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid)
            ON CONFLICT (id) DO UPDATE SET
              meal_id = EXCLUDED.meal_id,
              category_name = EXCLUDED.category_name,
              display_order = EXCLUDED.display_order,
              updated_at = NOW(),
              updated_by = EXCLUDED.updated_by
            WHERE cat_event_menu_categories.event_id = EXCLUDED.event_id AND cat_event_menu_categories.tenant_id = EXCLUDED.tenant_id
          `;

          const items = category.items || [];
          for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            const item = items[itemIndex];
            await tx.$executeRaw`
              INSERT INTO cat_event_menu_items (
                id, tenant_id, event_id, category_id, item_name, quantity, unit, remarks, display_order,
                catalog_item_id, recipe_variant_id, created_at, created_by, updated_at, updated_by
              ) VALUES (
                ${item.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${category.id}::uuid, ${item.itemName.trim()},
                ${item.quantity ?? null}, ${item.unit?.trim() || null}, ${item.remarks?.trim() || null}, ${itemIndex},
                ${item.catalogItemId || null}::uuid, ${item.recipeVariantId || null}::uuid,
                NOW(), ${userId}::uuid, NOW(), ${userId}::uuid
              )
              ON CONFLICT (id) DO UPDATE SET
                category_id = EXCLUDED.category_id,
                item_name = EXCLUDED.item_name,
                quantity = EXCLUDED.quantity,
                unit = EXCLUDED.unit,
                remarks = EXCLUDED.remarks,
                display_order = EXCLUDED.display_order,
                catalog_item_id = EXCLUDED.catalog_item_id,
                recipe_variant_id = EXCLUDED.recipe_variant_id,
                updated_at = NOW(),
                updated_by = EXCLUDED.updated_by
              WHERE cat_event_menu_items.event_id = EXCLUDED.event_id AND cat_event_menu_items.tenant_id = EXCLUDED.tenant_id
            `;
          }
        }
      }

      // 5. Dietary Requirements — reconcile full list.
      const existingDietary: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_event_dietary_requirements WHERE event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingDietaryIds = new Set(incomingDietary.map((d) => d.id));
      for (const row of existingDietary) {
        if (!incomingDietaryIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_event_dietary_requirements WHERE id = ${row.id}::uuid AND event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }
      for (let index = 0; index < incomingDietary.length; index++) {
        const req = incomingDietary[index];
        await tx.$executeRaw`
          INSERT INTO cat_event_dietary_requirements (id, tenant_id, event_id, requirement, guest_count, notes, display_order, created_at, created_by, updated_at, updated_by)
          VALUES (${req.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${req.requirement.trim()}, ${req.guestCount ?? null}, ${req.notes?.trim() || null}, ${index}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid)
          ON CONFLICT (id) DO UPDATE SET
            requirement = EXCLUDED.requirement,
            guest_count = EXCLUDED.guest_count,
            notes = EXCLUDED.notes,
            display_order = EXCLUDED.display_order,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
          WHERE cat_event_dietary_requirements.event_id = EXCLUDED.event_id AND cat_event_dietary_requirements.tenant_id = EXCLUDED.tenant_id
        `;
      }

      // 6. Service Instructions — 1:1 upsert.
      await tx.$executeRaw`
        INSERT INTO cat_event_menu_settings (id, tenant_id, event_id, service_instructions, created_at, created_by, updated_at, updated_by)
        VALUES (gen_random_uuid(), ${tenantId}::uuid, ${id}::uuid, ${serviceInstructions?.trim() || null}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid)
        ON CONFLICT (event_id) DO UPDATE SET
          service_instructions = EXCLUDED.service_instructions,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
        WHERE cat_event_menu_settings.tenant_id = ${tenantId}::uuid
      `;
    });

    const menu = await fetchMenu(id, tenantId);
    return NextResponse.json({ success: true, ...menu });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error saving Event Menu:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
