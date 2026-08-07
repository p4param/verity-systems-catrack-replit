// PM-WP01 — Vendor Master, Supply Portfolio tab.
// "What this Vendor supplies," grouped by resource type. Only 'INGREDIENT'
// is real today (backed by cat_vendor_ingredients); the type discriminator
// exists so the Supply Portfolio UI is already resource-type-aware and a
// future resource type is a new group + a new backing table, not a
// restructure of this tab. Vendor -> Resource links are owned here and
// will later be read (never duplicated) by Purchase Planning.
//
// PM-WP04A — ownership split: this tab still owns the link itself
// (add/remove) and Notes, but Priority (replacing isPreferred) is now
// read-only here — shown for context, edited only from the Ingredient
// Workspace's Vendor Recommendations tab.

export type SupplyResourceType = 'INGREDIENT';

export interface VendorIngredientLink {
  id: string;
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  baseUnit?: string;
  priority: number | null;
  notes?: string;
}
