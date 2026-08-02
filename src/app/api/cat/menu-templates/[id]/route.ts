import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// EM-WP04 — Menu Template Workspace.
// Single GET/PUT pair for one Template's header (name/description) and its
// full menu tree (Meals -> Categories -> Menu Items), Dietary Requirements,
// and Service Instructions. Same reconcile-the-full-tree-in-one-transaction
// pattern as EM-WP03's Event Menu endpoint, scoped to cat_menu_template_*
// tables instead of cat_event_* — completely separate persistence, no
// shared rows or foreign keys between a Template and any Event. No status,
// revision, workflow, or approval semantics — editable in place.

interface MenuItemInput {
  id: string;
  itemName: string;
  quantity?: number;
  unit?: string;
  remarks?: string;
}

interface MenuCategoryInput {
  id: string;
  categoryName: string;
  items: MenuItemInput[];
}

interface MenuMealInput {
  id: string;
  mealName: string;
  categories: MenuCategoryInput[];
}

interface DietaryRequirementInput {
  id: string;
  requirement: string;
  guestCount?: number;
  notes?: string;
}

async function ensureTemplateInTenant(templateId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id, template_name as "templateName", description
    FROM cat_menu_templates
    WHERE id = ${templateId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] || null;
}

async function fetchTemplateMenu(templateId: string, tenantId: string) {
  const mealRows: any[] = await prisma.$queryRaw`
    SELECT id, meal_name as "mealName", display_order as "displayOrder"
    FROM cat_menu_template_meals
    WHERE template_id = ${templateId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  const categoryRows: any[] = await prisma.$queryRaw`
    SELECT id, meal_id as "mealId", category_name as "categoryName", display_order as "displayOrder"
    FROM cat_menu_template_categories
    WHERE template_id = ${templateId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  const itemRows: any[] = await prisma.$queryRaw`
    SELECT id, category_id as "categoryId", item_name as "itemName", quantity, unit, remarks, display_order as "displayOrder"
    FROM cat_menu_template_items
    WHERE template_id = ${templateId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  const dietaryRequirements: any[] = await prisma.$queryRaw`
    SELECT id, requirement, guest_count as "guestCount", notes, display_order as "displayOrder"
    FROM cat_menu_template_dietary_requirements
    WHERE template_id = ${templateId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  const settingsRows: any[] = await prisma.$queryRaw`
    SELECT service_instructions as "serviceInstructions"
    FROM cat_menu_template_settings
    WHERE template_id = ${templateId}::uuid AND tenant_id = ${tenantId}::uuid
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
    const user = await requirePermission(req, 'CAT_MENU_TEMPLATE_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const template = await ensureTemplateInTenant(id, tenantId);
    if (!template) {
      return NextResponse.json({ success: false, error: 'Menu Template not found' }, { status: 404 });
    }

    const menu = await fetchTemplateMenu(id, tenantId);
    return NextResponse.json({ success: true, template, ...menu });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Menu Template:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_MENU_TEMPLATE_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const template = await ensureTemplateInTenant(id, tenantId);
    if (!template) {
      return NextResponse.json({ success: false, error: 'Menu Template not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      templateName,
      description,
      meals,
      dietaryRequirements,
      serviceInstructions,
    }: {
      templateName?: string;
      description?: string;
      meals?: MenuMealInput[];
      dietaryRequirements?: DietaryRequirementInput[];
      serviceInstructions?: string;
    } = body;

    if (!templateName?.trim()) {
      return NextResponse.json({ success: false, error: 'Template Name is required.' }, { status: 400 });
    }

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

    await prisma.$transaction(async (tx) => {
      // 0. Header.
      await tx.$executeRaw`
        UPDATE cat_menu_templates
        SET template_name = ${templateName.trim()}, description = ${description?.trim() || null}, updated_at = NOW(), updated_by = ${userId}::uuid
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;

      // 1. Meals — delete removed (cascades categories + items), then upsert.
      const existingMeals: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_menu_template_meals WHERE template_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingMealIds = new Set(incomingMeals.map((m) => m.id));
      for (const row of existingMeals) {
        if (!incomingMealIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_menu_template_meals WHERE id = ${row.id}::uuid AND template_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }

      // 2. Categories — delete removed (cascades items), across the whole template.
      const existingCategories: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_menu_template_categories WHERE template_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingCategoryIds = new Set(incomingMeals.flatMap((m) => (m.categories || []).map((c) => c.id)));
      for (const row of existingCategories) {
        if (!incomingCategoryIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_menu_template_categories WHERE id = ${row.id}::uuid AND template_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }

      // 3. Menu Items — delete removed, across the whole template.
      const existingItems: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_menu_template_items WHERE template_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingItemIds = new Set(
        incomingMeals.flatMap((m) => (m.categories || []).flatMap((c) => (c.items || []).map((i) => i.id))),
      );
      for (const row of existingItems) {
        if (!incomingItemIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_menu_template_items WHERE id = ${row.id}::uuid AND template_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }

      // 4. Upsert Meals -> Categories -> Items, in nested display order.
      for (let mealIndex = 0; mealIndex < incomingMeals.length; mealIndex++) {
        const meal = incomingMeals[mealIndex];
        await tx.$executeRaw`
          INSERT INTO cat_menu_template_meals (id, tenant_id, template_id, meal_name, display_order, created_at, created_by, updated_at, updated_by)
          VALUES (${meal.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${meal.mealName.trim()}, ${mealIndex}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid)
          ON CONFLICT (id) DO UPDATE SET
            meal_name = EXCLUDED.meal_name,
            display_order = EXCLUDED.display_order,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
          WHERE cat_menu_template_meals.template_id = EXCLUDED.template_id AND cat_menu_template_meals.tenant_id = EXCLUDED.tenant_id
        `;

        const categories = meal.categories || [];
        for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
          const category = categories[categoryIndex];
          await tx.$executeRaw`
            INSERT INTO cat_menu_template_categories (id, tenant_id, template_id, meal_id, category_name, display_order, created_at, created_by, updated_at, updated_by)
            VALUES (${category.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${meal.id}::uuid, ${category.categoryName.trim()}, ${categoryIndex}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid)
            ON CONFLICT (id) DO UPDATE SET
              meal_id = EXCLUDED.meal_id,
              category_name = EXCLUDED.category_name,
              display_order = EXCLUDED.display_order,
              updated_at = NOW(),
              updated_by = EXCLUDED.updated_by
            WHERE cat_menu_template_categories.template_id = EXCLUDED.template_id AND cat_menu_template_categories.tenant_id = EXCLUDED.tenant_id
          `;

          const items = category.items || [];
          for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            const item = items[itemIndex];
            await tx.$executeRaw`
              INSERT INTO cat_menu_template_items (
                id, tenant_id, template_id, category_id, item_name, quantity, unit, remarks, display_order,
                created_at, created_by, updated_at, updated_by
              ) VALUES (
                ${item.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${category.id}::uuid, ${item.itemName.trim()},
                ${item.quantity ?? null}, ${item.unit?.trim() || null}, ${item.remarks?.trim() || null}, ${itemIndex},
                NOW(), ${userId}::uuid, NOW(), ${userId}::uuid
              )
              ON CONFLICT (id) DO UPDATE SET
                category_id = EXCLUDED.category_id,
                item_name = EXCLUDED.item_name,
                quantity = EXCLUDED.quantity,
                unit = EXCLUDED.unit,
                remarks = EXCLUDED.remarks,
                display_order = EXCLUDED.display_order,
                updated_at = NOW(),
                updated_by = EXCLUDED.updated_by
              WHERE cat_menu_template_items.template_id = EXCLUDED.template_id AND cat_menu_template_items.tenant_id = EXCLUDED.tenant_id
            `;
          }
        }
      }

      // 5. Dietary Requirements — reconcile full list.
      const existingDietary: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_menu_template_dietary_requirements WHERE template_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingDietaryIds = new Set(incomingDietary.map((d) => d.id));
      for (const row of existingDietary) {
        if (!incomingDietaryIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_menu_template_dietary_requirements WHERE id = ${row.id}::uuid AND template_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }
      for (let index = 0; index < incomingDietary.length; index++) {
        const req = incomingDietary[index];
        await tx.$executeRaw`
          INSERT INTO cat_menu_template_dietary_requirements (id, tenant_id, template_id, requirement, guest_count, notes, display_order, created_at, created_by, updated_at, updated_by)
          VALUES (${req.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${req.requirement.trim()}, ${req.guestCount ?? null}, ${req.notes?.trim() || null}, ${index}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid)
          ON CONFLICT (id) DO UPDATE SET
            requirement = EXCLUDED.requirement,
            guest_count = EXCLUDED.guest_count,
            notes = EXCLUDED.notes,
            display_order = EXCLUDED.display_order,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
          WHERE cat_menu_template_dietary_requirements.template_id = EXCLUDED.template_id AND cat_menu_template_dietary_requirements.tenant_id = EXCLUDED.tenant_id
        `;
      }

      // 6. Service Instructions — 1:1 upsert.
      await tx.$executeRaw`
        INSERT INTO cat_menu_template_settings (id, tenant_id, template_id, service_instructions, created_at, created_by, updated_at, updated_by)
        VALUES (gen_random_uuid(), ${tenantId}::uuid, ${id}::uuid, ${serviceInstructions?.trim() || null}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid)
        ON CONFLICT (template_id) DO UPDATE SET
          service_instructions = EXCLUDED.service_instructions,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
        WHERE cat_menu_template_settings.tenant_id = ${tenantId}::uuid
      `;
    });

    const updatedTemplate = await ensureTemplateInTenant(id, tenantId);
    const menu = await fetchTemplateMenu(id, tenantId);
    return NextResponse.json({ success: true, template: updatedTemplate, ...menu });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error saving Menu Template:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
