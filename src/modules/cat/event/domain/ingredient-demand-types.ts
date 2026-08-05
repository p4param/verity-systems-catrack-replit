// EM-WP10 — Ingredient Demand Planning.
// Read-only aggregation of an Event's Recipe Scaling (EM-WP09) data:
// Meal-level subtotals first, then Overall — computed once server-side so
// "meal subtotals reconcile exactly to Overall" is a structural property
// (Overall is literally the sum of the Meal subtotals), not a coincidence.
// No unit conversion: every row is keyed by (ingredientId, unit) — the
// same Ingredient in two different Recipe Units produces two rows, never
// a converted, combined one. No manual adjustments anywhere in this shape.

export interface IngredientDemandOverallRow {
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  quantity: number;
  // Distinct contributing Menu Items (recipe instances) for this
  // ingredient across the whole event — not an ingredient-line count.
  usedInCount: number;
}

export interface IngredientDemandMeal {
  mealId: string;
  mealName: string;
}

export interface MealSubtotalRow {
  mealId: string;
  ingredientId: string;
  unit: string;
  quantity: number;
}

export interface ContributionRow {
  // EM-WP10A — Production Demand Engine. Carried on every row (including
  // single-Event Ingredient Demand) so the same shared engine and shape
  // serve both consumers; single-Event callers simply don't group by it.
  eventId: string;
  mealId: string;
  itemId: string;
  itemName: string;
  variantName: string;
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  quantity: number;
}

export interface ExcludedItem {
  itemId: string;
  itemName: string;
  eventId: string;
  mealId: string;
  mealName: string;
  reason: 'NO_RECIPE_LINKED' | 'UNIT_MISMATCH_OR_MISSING_QUANTITY';
}

export interface IngredientDemandSummary {
  uniqueIngredients: number;
  mealGroups: number;
  recipeContributions: number;
  excludedItemsCount: number;
}

export interface IngredientDemandResponse {
  success: boolean;
  overall: IngredientDemandOverallRow[];
  meals: IngredientDemandMeal[];
  mealSubtotals: MealSubtotalRow[];
  contributions: ContributionRow[];
  excludedItems: ExcludedItem[];
  summary: IngredientDemandSummary;
}
