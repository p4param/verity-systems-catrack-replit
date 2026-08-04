import { RecipeIngredient, RecipeVariant } from '@/modules/cat/menu-catalog/domain/menu-catalog-recipe-types';

// EM-WP09 — Recipe Scaling. Pure display math, computed on read — no new
// table, no versioning, matching the "compute on read" pattern already
// used for Menu Summary counts in MenuTreeEditor.
//
// Scale Factor = Menu Item quantity ÷ Recipe Variant yieldQuantity, only
// when the Menu Item's unit matches the Variant's yieldUnit exactly
// (case-insensitive). No unit conversion — out of scope for EM-WP09.

export interface ScaledIngredient {
  ingredientId: string;
  ingredientName: string;
  baseQuantity?: number;
  scaledQuantity?: number;
  recipeUnit?: string;
}

function unitsMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function computeScaleFactor(
  itemQuantity: number | undefined,
  itemUnit: string | undefined,
  variant: Pick<RecipeVariant, 'yieldQuantity' | 'yieldUnit'> | undefined,
): number | undefined {
  if (!variant) return undefined;
  if (itemQuantity == null || itemQuantity <= 0) return undefined;
  if (variant.yieldQuantity == null || variant.yieldQuantity <= 0) return undefined;
  if (!unitsMatch(itemUnit, variant.yieldUnit)) return undefined;
  return itemQuantity / variant.yieldQuantity;
}

export function computeScaledIngredients(ingredients: RecipeIngredient[], scaleFactor: number | undefined): ScaledIngredient[] {
  return ingredients.map((ing) => ({
    ingredientId: ing.ingredientId,
    ingredientName: ing.ingredientName,
    baseQuantity: ing.quantity,
    scaledQuantity: scaleFactor != null && ing.quantity != null ? ing.quantity * scaleFactor : undefined,
    recipeUnit: ing.recipeUnit,
  }));
}
