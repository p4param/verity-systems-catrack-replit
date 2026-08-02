// EM-WP04 — Menu Templates.
// The generic Meal -> Category -> Menu Item tree shape, shared between
// Event Menu Planning (EM-WP03) and Menu Templates (EM-WP04). Structurally
// identical to what each API persists, but this module carries no
// knowledge of which backing table (cat_event_* vs cat_menu_template_*) a
// given tree came from — that separation lives entirely in each feature's
// own API route and domain types, never here.

export interface MenuTreeItem {
  id: string;
  itemName: string;
  quantity?: number;
  unit?: string;
  remarks?: string;
  displayOrder: number;
}

export interface MenuTreeCategory {
  id: string;
  categoryName: string;
  displayOrder: number;
  items: MenuTreeItem[];
}

export interface MenuTreeMeal {
  id: string;
  mealName: string;
  displayOrder: number;
  categories: MenuTreeCategory[];
}

export interface MenuTreeDietaryRequirement {
  id: string;
  requirement: string;
  guestCount?: number;
  notes?: string;
  displayOrder: number;
}
