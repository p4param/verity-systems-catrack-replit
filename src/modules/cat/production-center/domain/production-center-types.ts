import { ContributionRow, ExcludedItem } from '@/modules/cat/event/domain/ingredient-demand-types';

// EM-WP10A — Production Center. Daily, multi-Event consolidation of
// EM-WP10's per-Event Ingredient Demand — same engine
// (production-demand-engine.ts), one more drill level: Ingredient ->
// Event -> Meal -> Recipe. Read-only, no unit conversion, no manual
// adjustments. Reuses ContributionRow/ExcludedItem as-is (both already
// carry eventId) rather than redefining an equivalent shape.

export interface ProductionCenterEventSummary {
  id: string;
  eventNumber: string;
  eventName: string;
  customerName: string;
  guestCount?: number;
  mealCount: number;
  status: string;
}

export interface ProductionCenterOverallRow {
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  quantity: number;
  usedByEventsCount: number;
  usedByRecipesCount: number;
}

export interface EventSubtotalRow {
  eventId: string;
  ingredientId: string;
  unit: string;
  quantity: number;
}

export interface ProductionMealSubtotalRow {
  eventId: string;
  mealId: string;
  mealName: string;
  ingredientId: string;
  unit: string;
  quantity: number;
}

export interface ProductionCenterExceptions {
  unitMismatch: ExcludedItem[];
  excludedRecipes: ExcludedItem[];
  eventsMissingMenu: { eventId: string; eventNumber: string; eventName: string }[];
  eventsMissingIngredientDemand: { eventId: string; eventNumber: string; eventName: string }[];
}

export interface ProductionCenterDashboard {
  events: number;
  guests: number;
  meals: number;
  recipeContributions: number;
  uniqueIngredients: number;
  warnings: number;
}

export interface ProductionCenterResponse {
  success: boolean;
  workDate: string;
  dashboard: ProductionCenterDashboard;
  events: ProductionCenterEventSummary[];
  overall: ProductionCenterOverallRow[];
  eventSubtotals: EventSubtotalRow[];
  mealSubtotals: ProductionMealSubtotalRow[];
  contributions: ContributionRow[];
  exceptions: ProductionCenterExceptions;
}
