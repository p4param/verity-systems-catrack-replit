// EM-WP04 — Menu Templates.
// Shared snapshot-copy primitives used by all three cross-entity menu
// operations: Save Event as Template, Apply Template to Event, and Copy
// From Existing Event. Every copy here is a deep copy with brand-new row
// ids — never a shared row, never a foreign key back to the source. The
// destination side always fully replaces whatever menu currently exists
// there (delete then insert, in the same transaction as the read), which
// is what makes "Apply" and "Copy From" safe to call unconditionally once
// the caller has confirmed with the user.

interface RawMenuTree {
  meals: Array<{
    id: string;
    mealName: string;
    displayOrder: number;
    categories: Array<{
      id: string;
      categoryName: string;
      displayOrder: number;
      items: Array<{
        id: string;
        itemName: string;
        quantity: number | null;
        unit: string | null;
        remarks: string | null;
        displayOrder: number;
      }>;
    }>;
  }>;
  dietaryRequirements: Array<{
    id: string;
    requirement: string;
    guestCount: number | null;
    notes: string | null;
    displayOrder: number;
  }>;
  serviceInstructions: string | null;
}

async function assembleTree(
  tx: any,
  scopeColumn: 'event_id' | 'template_id',
  scopeId: string,
  tenantId: string,
  tables: { meals: string; categories: string; items: string; dietary: string; settings: string },
): Promise<RawMenuTree> {
  const mealRows: any[] = await tx.$queryRawUnsafe(
    `SELECT id, meal_name as "mealName", display_order as "displayOrder" FROM ${tables.meals} WHERE ${scopeColumn} = $1::uuid AND tenant_id = $2::uuid ORDER BY display_order ASC`,
    scopeId,
    tenantId,
  );
  const categoryRows: any[] = await tx.$queryRawUnsafe(
    `SELECT id, meal_id as "mealId", category_name as "categoryName", display_order as "displayOrder" FROM ${tables.categories} WHERE ${scopeColumn} = $1::uuid AND tenant_id = $2::uuid ORDER BY display_order ASC`,
    scopeId,
    tenantId,
  );
  const itemRows: any[] = await tx.$queryRawUnsafe(
    `SELECT id, category_id as "categoryId", item_name as "itemName", quantity, unit, remarks, display_order as "displayOrder" FROM ${tables.items} WHERE ${scopeColumn} = $1::uuid AND tenant_id = $2::uuid ORDER BY display_order ASC`,
    scopeId,
    tenantId,
  );
  const dietaryRequirements: any[] = await tx.$queryRawUnsafe(
    `SELECT id, requirement, guest_count as "guestCount", notes, display_order as "displayOrder" FROM ${tables.dietary} WHERE ${scopeColumn} = $1::uuid AND tenant_id = $2::uuid ORDER BY display_order ASC`,
    scopeId,
    tenantId,
  );
  const settingsRows: any[] = await tx.$queryRawUnsafe(
    `SELECT service_instructions as "serviceInstructions" FROM ${tables.settings} WHERE ${scopeColumn} = $1::uuid AND tenant_id = $2::uuid LIMIT 1`,
    scopeId,
    tenantId,
  );

  const itemsByCategory = new Map<string, any[]>();
  for (const item of itemRows) {
    const list = itemsByCategory.get(item.categoryId) || [];
    list.push(item);
    itemsByCategory.set(item.categoryId, list);
  }
  const categoriesByMeal = new Map<string, any[]>();
  for (const category of categoryRows) {
    const list = categoriesByMeal.get(category.mealId) || [];
    list.push({ ...category, items: itemsByCategory.get(category.id) || [] });
    categoriesByMeal.set(category.mealId, list);
  }
  const meals = mealRows.map((meal) => ({ ...meal, categories: categoriesByMeal.get(meal.id) || [] }));

  return { meals, dietaryRequirements, serviceInstructions: settingsRows[0]?.serviceInstructions ?? null };
}

export function readEventMenuTree(tx: any, eventId: string, tenantId: string) {
  return assembleTree(tx, 'event_id', eventId, tenantId, {
    meals: 'cat_event_meals',
    categories: 'cat_event_menu_categories',
    items: 'cat_event_menu_items',
    dietary: 'cat_event_dietary_requirements',
    settings: 'cat_event_menu_settings',
  });
}

export function readTemplateMenuTree(tx: any, templateId: string, tenantId: string) {
  return assembleTree(tx, 'template_id', templateId, tenantId, {
    meals: 'cat_menu_template_meals',
    categories: 'cat_menu_template_categories',
    items: 'cat_menu_template_items',
    dietary: 'cat_menu_template_dietary_requirements',
    settings: 'cat_menu_template_settings',
  });
}

async function writeTree(
  tx: any,
  scopeColumn: 'event_id' | 'template_id',
  scopeId: string,
  tenantId: string,
  userId: string,
  tree: RawMenuTree,
  tables: { meals: string; categories: string; items: string; dietary: string; settings: string },
) {
  // Full replace: wipe whatever currently exists at the destination (cascade
  // handles categories/items), then insert the source tree with brand-new
  // ids. Never reuses the destination's previous ids, and never reuses the
  // source's ids either — a genuine deep copy, not a move or a reference.
  await tx.$executeRawUnsafe(`DELETE FROM ${tables.meals} WHERE ${scopeColumn} = $1::uuid AND tenant_id = $2::uuid`, scopeId, tenantId);
  await tx.$executeRawUnsafe(`DELETE FROM ${tables.dietary} WHERE ${scopeColumn} = $1::uuid AND tenant_id = $2::uuid`, scopeId, tenantId);

  for (let mealIndex = 0; mealIndex < tree.meals.length; mealIndex++) {
    const meal = tree.meals[mealIndex];
    const newMealId = crypto.randomUUID();
    await tx.$executeRawUnsafe(
      `INSERT INTO ${tables.meals} (id, tenant_id, ${scopeColumn}, meal_name, display_order, created_at, created_by, updated_at, updated_by)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, NOW(), $6::uuid, NOW(), $6::uuid)`,
      newMealId,
      tenantId,
      scopeId,
      meal.mealName,
      mealIndex,
      userId,
    );

    for (let categoryIndex = 0; categoryIndex < meal.categories.length; categoryIndex++) {
      const category = meal.categories[categoryIndex];
      const newCategoryId = crypto.randomUUID();
      await tx.$executeRawUnsafe(
        `INSERT INTO ${tables.categories} (id, tenant_id, ${scopeColumn}, meal_id, category_name, display_order, created_at, created_by, updated_at, updated_by)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, NOW(), $7::uuid, NOW(), $7::uuid)`,
        newCategoryId,
        tenantId,
        scopeId,
        newMealId,
        category.categoryName,
        categoryIndex,
        userId,
      );

      for (let itemIndex = 0; itemIndex < category.items.length; itemIndex++) {
        const item = category.items[itemIndex];
        await tx.$executeRawUnsafe(
          `INSERT INTO ${tables.items} (id, tenant_id, ${scopeColumn}, category_id, item_name, quantity, unit, remarks, display_order, created_at, created_by, updated_at, updated_by)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8, $9, NOW(), $10::uuid, NOW(), $10::uuid)`,
          crypto.randomUUID(),
          tenantId,
          scopeId,
          newCategoryId,
          item.itemName,
          item.quantity,
          item.unit,
          item.remarks,
          itemIndex,
          userId,
        );
      }
    }
  }

  for (let index = 0; index < tree.dietaryRequirements.length; index++) {
    const req = tree.dietaryRequirements[index];
    await tx.$executeRawUnsafe(
      `INSERT INTO ${tables.dietary} (id, tenant_id, ${scopeColumn}, requirement, guest_count, notes, display_order, created_at, created_by, updated_at, updated_by)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, NOW(), $8::uuid, NOW(), $8::uuid)`,
      crypto.randomUUID(),
      tenantId,
      scopeId,
      req.requirement,
      req.guestCount,
      req.notes,
      index,
      userId,
    );
  }

  await tx.$executeRawUnsafe(
    `INSERT INTO ${tables.settings} (id, tenant_id, ${scopeColumn}, service_instructions, created_at, created_by, updated_at, updated_by)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, NOW(), $5::uuid, NOW(), $5::uuid)
     ON CONFLICT (${scopeColumn}) DO UPDATE SET service_instructions = EXCLUDED.service_instructions, updated_at = NOW(), updated_by = EXCLUDED.updated_by
     WHERE ${tables.settings}.tenant_id = $2::uuid`,
    crypto.randomUUID(),
    tenantId,
    scopeId,
    tree.serviceInstructions,
    userId,
  );
}

export function writeEventMenuTree(tx: any, eventId: string, tenantId: string, userId: string, tree: RawMenuTree) {
  return writeTree(tx, 'event_id', eventId, tenantId, userId, tree, {
    meals: 'cat_event_meals',
    categories: 'cat_event_menu_categories',
    items: 'cat_event_menu_items',
    dietary: 'cat_event_dietary_requirements',
    settings: 'cat_event_menu_settings',
  });
}

export function writeTemplateMenuTree(tx: any, templateId: string, tenantId: string, userId: string, tree: RawMenuTree) {
  return writeTree(tx, 'template_id', templateId, tenantId, userId, tree, {
    meals: 'cat_menu_template_meals',
    categories: 'cat_menu_template_categories',
    items: 'cat_menu_template_items',
    dietary: 'cat_menu_template_dietary_requirements',
    settings: 'cat_menu_template_settings',
  });
}
