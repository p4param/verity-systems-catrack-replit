// EM-WP06 — Recipe Management.
// Recipes define HOW a dish is produced — not procurement, inventory,
// costing, or production execution. A Menu Catalog Item can have multiple
// user-named Recipe Variants; exactly one is the Default Variant.
// Ingredients are free-text rows — no Ingredient Master. No versioning,
// no workflow.

export interface RecipeIngredient {
  id: string;
  ingredientName: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  displayOrder: number;
}

export interface RecipeStep {
  id: string;
  instruction: string;
  displayOrder: number;
}

export interface RecipeEquipment {
  id: string;
  equipmentName: string;
  notes?: string;
  displayOrder: number;
}

export interface RecipeVariant {
  id: string;
  variantName: string;
  isDefault: boolean;
  recipeSummary?: string;
  yieldQuantity?: number;
  yieldUnit?: string;
  yieldNotes?: string;
  qualityNotes?: string;
  displayOrder: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  equipment: RecipeEquipment[];
}

// Input shapes accepted by PUT /api/cat/menu-catalog/{id}/recipes — the
// client always sends every current Variant in full; the endpoint
// reconciles each level (delete removed, upsert incoming) in one
// transaction, and validates exactly one Default Variant.

export interface RecipeIngredientInput {
  id: string;
  ingredientName: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export interface RecipeStepInput {
  id: string;
  instruction: string;
}

export interface RecipeEquipmentInput {
  id: string;
  equipmentName: string;
  notes?: string;
}

export interface RecipeVariantInput {
  id: string;
  variantName: string;
  isDefault: boolean;
  recipeSummary?: string;
  yieldQuantity?: number;
  yieldUnit?: string;
  yieldNotes?: string;
  qualityNotes?: string;
  ingredients: RecipeIngredientInput[];
  steps: RecipeStepInput[];
  equipment: RecipeEquipmentInput[];
}
