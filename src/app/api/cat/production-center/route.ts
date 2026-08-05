import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { computeProductionDemand } from '@/modules/cat/event/domain/production-demand-engine';
import {
  EventSubtotalRow,
  ProductionCenterDashboard,
  ProductionCenterEventSummary,
  ProductionCenterExceptions,
  ProductionCenterOverallRow,
  ProductionMealSubtotalRow,
} from '@/modules/cat/production-center/domain/production-center-types';

// EM-WP10A — Production Center. Read-only GET only. Consolidates EM-WP10's
// Ingredient Demand across every Event scheduled on one Work Date, via the
// shared production-demand-engine.ts — one batched query pass for however
// many Events share the date, not N calls to the single-Event endpoint.
// Do not recalculate recipes here; this only re-groups what the engine
// already computed, one level higher (Event) than EM-WP10's Meal level.

interface EventRow {
  id: string;
  eventNumber: string;
  eventName: string;
  customerName: string;
  guestCount: number | null;
  status: string;
  mealCount: number;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_EVENT_VIEW');
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);
    const workDateParam = searchParams.get('workDate');
    const workDate = workDateParam || new Date().toISOString().slice(0, 10);
    const status = searchParams.get('status') || 'ALL';

    // Status filter: EventStatus is 'PLANNING' only today — no schema
    // change to add Confirmed/Production Ready. Accepted as a plain
    // string (not narrowed to the current TS union) and applied verbatim
    // when not 'ALL', so the filter is already wired for whenever more
    // statuses exist; unrecognised values just return zero Events today,
    // honestly, rather than faking data.
    const statusFilter = status !== 'ALL' ? status : null;

    const eventRows: EventRow[] = await prisma.$queryRawUnsafe(
      `SELECT
         e.id, e.event_number as "eventNumber", e.event_name as "eventName",
         r.name as "customerName", e.guest_count as "guestCount", e.status,
         COALESCE(mc.meal_count, 0)::int as "mealCount"
       FROM cat_events e
       JOIN cat_relationships r ON r.id = e.relationship_id
       LEFT JOIN (
         SELECT event_id, COUNT(*)::int as meal_count FROM cat_event_meals GROUP BY event_id
       ) mc ON mc.event_id = e.id
       WHERE e.tenant_id = $1::uuid AND e.is_deleted = false AND e.event_date = $2::date
       ${statusFilter ? 'AND e.status = $3' : ''}
       ORDER BY e.event_name ASC`,
      ...(statusFilter ? [tenantId, workDate, statusFilter] : [tenantId, workDate]),
    );

    const eventIds = eventRows.map((e) => e.id);
    const { itemRows, contributions, excludedItems } = await computeProductionDemand(tenantId, eventIds);

    // Event Summary rows.
    const events: ProductionCenterEventSummary[] = eventRows.map((e) => ({
      id: e.id,
      eventNumber: e.eventNumber,
      eventName: e.eventName,
      customerName: e.customerName,
      guestCount: e.guestCount == null ? undefined : Number(e.guestCount),
      mealCount: e.mealCount,
      status: e.status,
    }));

    // Event subtotals — group contributions by (eventId, ingredientId, unit).
    const eventSubtotalMap = new Map<string, EventSubtotalRow>();
    for (const c of contributions) {
      const key = `${c.eventId}::${c.ingredientId}::${c.unit}`;
      const existing = eventSubtotalMap.get(key);
      if (existing) existing.quantity += c.quantity;
      else eventSubtotalMap.set(key, { eventId: c.eventId, ingredientId: c.ingredientId, unit: c.unit, quantity: c.quantity });
    }
    const eventSubtotals = [...eventSubtotalMap.values()];

    // Meal subtotals — group contributions by (eventId, mealId, ingredientId, unit).
    const mealSubtotalMap = new Map<string, ProductionMealSubtotalRow>();
    for (const c of contributions) {
      const key = `${c.eventId}::${c.mealId}::${c.ingredientId}::${c.unit}`;
      const existing = mealSubtotalMap.get(key);
      if (existing) existing.quantity += c.quantity;
      else {
        const mealName = itemRows.find((r) => r.mealId === c.mealId)?.mealName || '';
        mealSubtotalMap.set(key, { eventId: c.eventId, mealId: c.mealId, mealName, ingredientId: c.ingredientId, unit: c.unit, quantity: c.quantity });
      }
    }
    const mealSubtotals = [...mealSubtotalMap.values()];

    // Overall — sum of Event subtotals (structural reconciliation: Overall
    // is never independently recomputed from raw contributions, only from
    // the coarser rollup directly beneath it — same pattern as EM-WP10's
    // Meal -> Overall, one level deeper).
    const overallMap = new Map<string, ProductionCenterOverallRow & { eventSet: Set<string>; recipeSet: Set<string> }>();
    for (const s of eventSubtotals) {
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
          usedByEventsCount: 0,
          usedByRecipesCount: 0,
          eventSet: new Set(),
          recipeSet: new Set(),
        });
      }
    }
    for (const c of contributions) {
      const key = `${c.ingredientId}::${c.unit}`;
      const row = overallMap.get(key);
      if (!row) continue;
      row.eventSet.add(c.eventId);
      row.recipeSet.add(`${c.eventId}::${c.mealId}::${c.itemId}`);
    }
    const overall: ProductionCenterOverallRow[] = [...overallMap.values()]
      .map(({ eventSet, recipeSet, ...row }) => ({ ...row, usedByEventsCount: eventSet.size, usedByRecipesCount: recipeSet.size }))
      .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));

    // Exceptions.
    const eventIdsWithContribution = new Set(contributions.map((c) => c.eventId));
    const eventsMissingMenu = eventRows.filter((e) => e.mealCount === 0).map((e) => ({ eventId: e.id, eventNumber: e.eventNumber, eventName: e.eventName }));
    const eventsMissingIngredientDemand = eventRows
      .filter((e) => e.mealCount > 0 && !eventIdsWithContribution.has(e.id))
      .map((e) => ({ eventId: e.id, eventNumber: e.eventNumber, eventName: e.eventName }));

    const exceptions: ProductionCenterExceptions = {
      unitMismatch: excludedItems.filter((x) => x.reason === 'UNIT_MISMATCH_OR_MISSING_QUANTITY'),
      excludedRecipes: excludedItems.filter((x) => x.reason === 'NO_RECIPE_LINKED'),
      eventsMissingMenu,
      eventsMissingIngredientDemand,
    };

    const dashboard: ProductionCenterDashboard = {
      events: eventRows.length,
      guests: eventRows.reduce((sum, e) => sum + (e.guestCount == null ? 0 : Number(e.guestCount)), 0),
      meals: eventRows.reduce((sum, e) => sum + e.mealCount, 0),
      recipeContributions: new Set(contributions.map((c) => `${c.eventId}::${c.mealId}::${c.itemId}`)).size,
      uniqueIngredients: new Set(overall.map((r) => r.ingredientId)).size,
      warnings: exceptions.unitMismatch.length + exceptions.excludedRecipes.length + eventsMissingMenu.length + eventsMissingIngredientDemand.length,
    };

    return NextResponse.json({
      success: true,
      workDate,
      dashboard,
      events,
      overall,
      eventSubtotals,
      mealSubtotals,
      contributions,
      exceptions,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error computing Production Center demand:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
