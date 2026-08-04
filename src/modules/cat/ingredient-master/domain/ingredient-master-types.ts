// EM-WP07 — Ingredient Master. EM-WP08 — Recipe Ingredients reference
// this master by id (structural relationship only). Not connected to
// Procurement or Inventory yet. No pricing, conversions, vendors, batch
// tracking, or nutrition.

export type IngredientMasterStatus = 'ACTIVE' | 'INACTIVE';

export const INGREDIENT_MASTER_STATUS_LABELS: Record<IngredientMasterStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

export interface IngredientMasterSummary {
  id: string;
  ingredientCode: string;
  name: string;
  ingredientType?: string;
  baseUnit?: string;
  storage?: string;
  procurementCategory?: string;
  status: IngredientMasterStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientMasterDetail {
  id: string;
  ingredientCode: string;
  name: string;
  ingredientType?: string;
  baseUnit?: string;
  purchaseUnit?: string;
  storage?: string;
  shelfLife?: string;
  foodCharacteristics?: string;
  procurementCategory?: string;
  description?: string;
  imageUrl?: string;
  status: IngredientMasterStatus;
  createdAt: string;
  updatedAt: string;
}
