// EM-WP05 — Menu Catalog.
// The organization's reusable master data for menu items — independent of
// Events and Menu Templates. No recipe linkage, ingredients, costing,
// procurement, kitchen, AI, or versioning. Catalog edits never affect an
// Event or Template that already added an item "From Catalog" — that
// operation only ever copies these field values in at add-time; nothing
// here is referenced by id from cat_event_menu_items or
// cat_menu_template_items.

export type MenuCatalogDietaryType = 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN';

export const MENU_CATALOG_DIETARY_TYPE_LABELS: Record<MenuCatalogDietaryType, string> = {
  VEG: 'Veg',
  NON_VEG: 'Non-Veg',
  EGG: 'Egg',
  VEGAN: 'Vegan',
};

export type MenuCatalogStatus = 'ACTIVE' | 'INACTIVE';

export const MENU_CATALOG_STATUS_LABELS: Record<MenuCatalogStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

export interface MenuCatalogItemSummary {
  id: string;
  name: string;
  category?: string;
  cuisine?: string;
  dietaryType: MenuCatalogDietaryType;
  status: MenuCatalogStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCatalogItemDetail {
  id: string;
  name: string;
  category?: string;
  cuisine?: string;
  dietaryType: MenuCatalogDietaryType;
  dietaryNotes?: string;
  defaultUnit?: string;
  servingNotes?: string;
  description?: string;
  imageUrl?: string;
  status: MenuCatalogStatus;
  createdAt: string;
  updatedAt: string;
}
