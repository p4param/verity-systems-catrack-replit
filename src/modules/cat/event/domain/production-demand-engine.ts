import { prisma } from '@/lib/prisma';
import { computeScaleFactor } from '@/modules/cat/menu/domain/recipe-scaling';
import { ContributionRow, ExcludedItem } from '@/modules/cat/event/domain/ingredient-demand-types';

// EM-WP10 / EM-WP10A — Production Demand Engine.
// The one place Recipe Scaling contributions get computed from Event Menu
// Items. EM-WP10 (single-Event Ingredient Demand) and EM-WP10A (Production
// Center — multi-Event daily consolidation) both call this; neither
// recomputes or duplicates it. Parameterized over a list of Event ids so
// the multi-Event case is one batched query pass, not N calls — read-only,
// no unit conversion, no manual adjustments, matching EM-WP10's rules
// exactly, unchanged.

export interface ProductionDemandItemRow {
  itemId: string;
  itemName: string;
  quantity: number | null;
  unit: string | null;
  catalogItemId: string | null;
  recipeVariantId: string | null;
  eventId: string;
  mealId: string;
  mealName: string;
  variantName: string | null;
  yieldQuantity: number | null;
  yieldUnit: string | null;
}

interface IngredientRow {
  variantId: string;
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  quantity: number | null;
  recipeUnit: string | null;
}

export interface ProductionDemandResult {
  itemRows: ProductionDemandItemRow[];
  contributions: ContributionRow[];
  excludedItems: ExcludedItem[];
}

export async function computeProductionDemand(tenantId: string, eventIds: string[]): Promise<ProductionDemandResult> {
  if (eventIds.length === 0) {
    return { itemRows: [], contributions: [], excludedItems: [] };
  }

  const itemRows: ProductionDemandItemRow[] = await prisma.$queryRaw`
    SELECT
      ei.id as "itemId", ei.item_name as "itemName", ei.quantity, ei.unit,
      ei.catalog_item_id as "catalogItemId", ei.recipe_variant_id as "recipeVariantId",
      ei.event_id as "eventId", meal.id as "mealId", meal.meal_name as "mealName",
      rv.variant_name as "variantName", rv.yield_quantity as "yieldQuantity", rv.yield_unit as "yieldUnit"
    FROM cat_event_menu_items ei
    JOIN cat_event_menu_categories emc ON emc.id = ei.category_id
    JOIN cat_event_meals meal ON meal.id = emc.meal_id
    LEFT JOIN cat_menu_catalog_recipe_variants rv ON rv.id = ei.recipe_variant_id
    WHERE ei.event_id = ANY(${eventIds}::uuid[]) AND ei.tenant_id = ${tenantId}::uuid
    ORDER BY ei.event_id ASC, meal.display_order ASC, ei.display_order ASC
  `;

  const variantIds = [...new Set(itemRows.filter((r) => r.recipeVariantId).map((r) => r.recipeVariantId as string))];
  const ingredientRows: IngredientRow[] =
    variantIds.length > 0
      ? await prisma.$queryRaw`
          SELECT ri.variant_id as "variantId", ri.ingredient_id as "ingredientId", im.ingredient_code as "ingredientCode", im.name as "ingredientName",
                 ri.quantity, ri.recipe_unit as "recipeUnit"
          FROM cat_menu_catalog_recipe_ingredients ri
          JOIN cat_ingredient_master_items im ON im.id = ri.ingredient_id
          WHERE ri.variant_id = ANY(${variantIds}::uuid[])
          ORDER BY ri.display_order ASC
        `
      : [];

  const ingredientsByVariantId = new Map<string, IngredientRow[]>();
  for (const row of ingredientRows) {
    const list = ingredientsByVariantId.get(row.variantId) || [];
    list.push({ ...row, quantity: row.quantity == null ? null : Number(row.quantity) });
    ingredientsByVariantId.set(row.variantId, list);
  }

  const contributions: ContributionRow[] = [];
  const excludedItems: ExcludedItem[] = [];

  for (const item of itemRows) {
    const quantity = item.quantity == null ? undefined : Number(item.quantity);
    const yieldQuantity = item.yieldQuantity == null ? undefined : Number(item.yieldQuantity);

    if (!item.catalogItemId || !item.recipeVariantId) {
      excludedItems.push({
        itemId: item.itemId,
        itemName: item.itemName,
        eventId: item.eventId,
        mealId: item.mealId,
        mealName: item.mealName,
        reason: 'NO_RECIPE_LINKED',
      });
      continue;
    }

    const scaleFactor = computeScaleFactor(quantity, item.unit ?? undefined, {
      yieldQuantity,
      yieldUnit: item.yieldUnit ?? undefined,
    });
    if (scaleFactor == null) {
      excludedItems.push({
        itemId: item.itemId,
        itemName: item.itemName,
        eventId: item.eventId,
        mealId: item.mealId,
        mealName: item.mealName,
        reason: 'UNIT_MISMATCH_OR_MISSING_QUANTITY',
      });
      continue;
    }

    const ingredients = ingredientsByVariantId.get(item.recipeVariantId) || [];
    for (const ing of ingredients) {
      if (ing.quantity == null || !ing.recipeUnit) continue;
      contributions.push({
        eventId: item.eventId,
        mealId: item.mealId,
        itemId: item.itemId,
        itemName: item.itemName,
        variantName: item.variantName || '',
        ingredientId: ing.ingredientId,
        ingredientCode: ing.ingredientCode,
        ingredientName: ing.ingredientName,
        unit: ing.recipeUnit,
        quantity: ing.quantity * scaleFactor,
      });
    }
  }

  return { itemRows, contributions, excludedItems };
}
