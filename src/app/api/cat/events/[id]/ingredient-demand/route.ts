import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { computeProductionDemand } from '@/modules/cat/event/domain/production-demand-engine';
import {
  IngredientDemandMeal,
  IngredientDemandOverallRow,
  IngredientDemandSummary,
  MealSubtotalRow,
} from '@/modules/cat/event/domain/ingredient-demand-types';

// EM-WP10 — Ingredient Demand Planning. Read-only GET only — no PUT/POST,
// no persisted state, nothing here mutates anything. Aggregates the
// Recipe Scaling data EM-WP09 already computes per Menu Item: Meal
// subtotals first, then Overall = the sum of the Meal subtotals (so
// reconciliation is structural, not incidental). No unit conversion —
// every row is keyed by (ingredientId, unit).
//
// EM-WP10A — the per-item scale-factor + ingredient-line computation now
// lives in the shared production-demand-engine.ts (also used by Production
// Center's multi-Event consolidation); this route calls it for a single
// Event and builds the same Meal/Overall/Summary shape it always has.

async function ensureEventInTenant(eventId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id FROM cat_events
    WHERE id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] || null;
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

    const { itemRows, contributions, excludedItems } = await computeProductionDemand(tenantId, [id]);

    // Meal subtotals — group contributions by (mealId, ingredientId, unit).
    const mealSubtotalMap = new Map<string, MealSubtotalRow>();
    for (const c of contributions) {
      const key = `${c.mealId}::${c.ingredientId}::${c.unit}`;
      const existing = mealSubtotalMap.get(key);
      if (existing) existing.quantity += c.quantity;
      else mealSubtotalMap.set(key, { mealId: c.mealId, ingredientId: c.ingredientId, unit: c.unit, quantity: c.quantity });
    }
    const mealSubtotals = [...mealSubtotalMap.values()];

    // Overall — sum of the Meal subtotals (structural reconciliation, not
    // a separately recomputed aggregate).
    const overallMap = new Map<string, IngredientDemandOverallRow & { usedInSet: Set<string> }>();
    for (const s of mealSubtotals) {
      const key = `${s.ingredientId}::${s.unit}`;
      const existing = overallMap.get(key);
      if (existing) existing.quantity += s.quantity;
      else {
        const source = contributions.find((c) => c.ingredientId === s.ingredientId && c.unit === s.unit);
        overallMap.set(key, {
          ingredientId: s.ingredientId,
          ingredientCode: source?.ingredientCode || '',
          ingredientName: source?.ingredientName || '',
          unit: s.unit,
          quantity: s.quantity,
          usedInCount: 0,
          usedInSet: new Set(),
        });
      }
    }
    for (const c of contributions) {
      const key = `${c.ingredientId}::${c.unit}`;
      overallMap.get(key)?.usedInSet.add(`${c.mealId}::${c.itemId}`);
    }
    const overall: IngredientDemandOverallRow[] = [...overallMap.values()]
      .map(({ usedInSet, ...row }) => ({ ...row, usedInCount: usedInSet.size }))
      .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));

    // Meals — only those with at least one qualifying contribution; no
    // fixed meal concept, whatever the planner has defined in Menu
    // Planning that actually contributed.
    const mealsMap = new Map<string, IngredientDemandMeal>();
    for (const c of contributions) {
      if (!mealsMap.has(c.mealId)) {
        const name = itemRows.find((r) => r.mealId === c.mealId)?.mealName || '';
        mealsMap.set(c.mealId, { mealId: c.mealId, mealName: name });
      }
    }
    const meals = [...mealsMap.values()];

    const distinctRecipeContributions = new Set(contributions.map((c) => `${c.mealId}::${c.itemId}`)).size;
    const summary: IngredientDemandSummary = {
      uniqueIngredients: new Set(overall.map((r) => r.ingredientId)).size,
      mealGroups: meals.length,
      recipeContributions: distinctRecipeContributions,
      excludedItemsCount: excludedItems.length,
    };

    return NextResponse.json({ success: true, overall, meals, mealSubtotals, contributions, excludedItems, summary });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error computing Ingredient Demand:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
