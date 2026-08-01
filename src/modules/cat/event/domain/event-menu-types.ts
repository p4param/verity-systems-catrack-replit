// EM-WP03 — Menu Planning.
// Defines WHAT will be served: Event -> Meals -> Categories -> Menu Items,
// plus Dietary Requirements and Service Instructions. No recipe linkage,
// no procurement, no production, no costing. No status, revision,
// workflow, or approval fields — editable only, saved and reloaded as-is
// via a single GET/PUT pair, following the pattern established by
// event-planning-types.ts (EM-WP02).

export interface EventMenuItem {
  id: string;
  itemName: string;
  quantity?: number;
  unit?: string;
  remarks?: string;
  displayOrder: number;
}

export interface EventMenuCategory {
  id: string;
  categoryName: string;
  displayOrder: number;
  items: EventMenuItem[];
}

export interface EventMeal {
  id: string;
  mealName: string;
  displayOrder: number;
  categories: EventMenuCategory[];
}

export interface EventDietaryRequirement {
  id: string;
  requirement: string;
  guestCount?: number;
  notes?: string;
  displayOrder: number;
}

export interface EventMenuDetail {
  meals: EventMeal[];
  dietaryRequirements: EventDietaryRequirement[];
  serviceInstructions?: string;
}

// Input shapes accepted by PUT /api/cat/events/{id}/menu — the client
// always sends the entire current tree; the endpoint reconciles every
// level (delete removed, upsert incoming) in one transaction.

export interface EventMenuItemInput {
  id: string;
  itemName: string;
  quantity?: number;
  unit?: string;
  remarks?: string;
}

export interface EventMenuCategoryInput {
  id: string;
  categoryName: string;
  items: EventMenuItemInput[];
}

export interface EventMealInput {
  id: string;
  mealName: string;
  categories: EventMenuCategoryInput[];
}

export interface EventDietaryRequirementInput {
  id: string;
  requirement: string;
  guestCount?: number;
  notes?: string;
}

export interface EventMenuSavePayload {
  meals: EventMealInput[];
  dietaryRequirements: EventDietaryRequirementInput[];
  serviceInstructions?: string;
}
