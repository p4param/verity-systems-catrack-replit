// PM-WP01 — Vendor Master, Supply Portfolio tab.
// "What this Vendor supplies," grouped by resource type. Only 'INGREDIENT'
// is real today (backed by cat_vendor_ingredients); the type discriminator
// exists so the Supply Portfolio UI is already resource-type-aware and a
// future resource type is a new group + a new backing table, not a
// restructure of this tab. Vendor -> Resource links are owned here and
// will later be read (never duplicated) by Purchase Planning.

export type SupplyResourceType = 'INGREDIENT';

export interface VendorIngredientLink {
  id: string;
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  baseUnit?: string;
  isPreferred: boolean;
  notes?: string;
}
