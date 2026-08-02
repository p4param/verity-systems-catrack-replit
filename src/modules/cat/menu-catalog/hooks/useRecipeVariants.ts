'use client';

import { useState } from 'react';
import { RecipeEquipment, RecipeIngredient, RecipeStep, RecipeVariant } from '@/modules/cat/menu-catalog/domain/menu-catalog-recipe-types';

// EM-WP06 — Recipe Management.
// Recipe Variant tree editing state and operations, mirroring the
// establishing pattern in useMenuTree.ts (EM-WP04): local state plus a
// full set of add/update/delete/move handlers, persistence left entirely
// to the caller.

function blankVariant(isDefault: boolean): RecipeVariant {
  return {
    id: crypto.randomUUID(),
    variantName: '',
    isDefault,
    recipeSummary: '',
    yieldQuantity: undefined,
    yieldUnit: '',
    yieldNotes: '',
    qualityNotes: '',
    displayOrder: 0,
    ingredients: [],
    steps: [],
    equipment: [],
  };
}
function blankIngredient(): RecipeIngredient {
  return { id: crypto.randomUUID(), ingredientName: '', quantity: undefined, unit: '', notes: '', displayOrder: 0 };
}
function blankStep(): RecipeStep {
  return { id: crypto.randomUUID(), instruction: '', displayOrder: 0 };
}
function blankEquipment(): RecipeEquipment {
  return { id: crypto.randomUUID(), equipmentName: '', notes: '', displayOrder: 0 };
}

export function useRecipeVariants() {
  const [variants, setVariants] = useState<RecipeVariant[]>([]);

  // Variant-level operations. The first Variant ever added becomes the
  // Default automatically (satisfies "exactly one Default Variant" as
  // soon as any Variant exists); deleting the Default promotes the next
  // remaining Variant so the invariant never breaks in the UI. addVariant
  // returns the new Variant's id (generated up front, independent of the
  // functional setState update) so the caller can select it immediately.
  const addVariant = () => {
    const newVariant = blankVariant(false);
    setVariants((prev) => [...prev, { ...newVariant, isDefault: prev.length === 0 }]);
    return newVariant.id;
  };
  const updateVariant = (variantId: string, patch: Partial<RecipeVariant>) =>
    setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, ...patch } : v)));
  const deleteVariant = (variantId: string) =>
    setVariants((prev) => {
      const target = prev.find((v) => v.id === variantId);
      const next = prev.filter((v) => v.id !== variantId);
      if (target?.isDefault && next.length > 0 && !next.some((v) => v.isDefault)) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
  const moveVariant = (index: number, direction: -1 | 1) =>
    setVariants((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const setDefaultVariant = (variantId: string) =>
    setVariants((prev) => prev.map((v) => ({ ...v, isDefault: v.id === variantId })));

  // Ingredient-level operations (scoped to one Variant).
  const addIngredient = (variantId: string) =>
    setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, ingredients: [...v.ingredients, blankIngredient()] } : v)));
  const updateIngredient = (variantId: string, ingredientId: string, patch: Partial<RecipeIngredient>) =>
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId ? { ...v, ingredients: v.ingredients.map((i) => (i.id === ingredientId ? { ...i, ...patch } : i)) } : v,
      ),
    );
  const deleteIngredient = (variantId: string, ingredientId: string) =>
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, ingredients: v.ingredients.filter((i) => i.id !== ingredientId) } : v)),
    );
  const moveIngredient = (variantId: string, index: number, direction: -1 | 1) =>
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        const target = index + direction;
        if (target < 0 || target >= v.ingredients.length) return v;
        const next = [...v.ingredients];
        [next[index], next[target]] = [next[target], next[index]];
        return { ...v, ingredients: next };
      }),
    );

  // Step-level operations (scoped to one Variant).
  const addStep = (variantId: string) => setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, steps: [...v.steps, blankStep()] } : v)));
  const updateStep = (variantId: string, stepId: string, patch: Partial<RecipeStep>) =>
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, steps: v.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) } : v)),
    );
  const deleteStep = (variantId: string, stepId: string) =>
    setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, steps: v.steps.filter((s) => s.id !== stepId) } : v)));
  const moveStep = (variantId: string, index: number, direction: -1 | 1) =>
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        const target = index + direction;
        if (target < 0 || target >= v.steps.length) return v;
        const next = [...v.steps];
        [next[index], next[target]] = [next[target], next[index]];
        return { ...v, steps: next };
      }),
    );

  // Equipment-level operations (scoped to one Variant).
  const addEquipment = (variantId: string) =>
    setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, equipment: [...v.equipment, blankEquipment()] } : v)));
  const updateEquipment = (variantId: string, equipmentId: string, patch: Partial<RecipeEquipment>) =>
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId ? { ...v, equipment: v.equipment.map((e) => (e.id === equipmentId ? { ...e, ...patch } : e)) } : v,
      ),
    );
  const deleteEquipment = (variantId: string, equipmentId: string) =>
    setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, equipment: v.equipment.filter((e) => e.id !== equipmentId) } : v)));
  const moveEquipment = (variantId: string, index: number, direction: -1 | 1) =>
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        const target = index + direction;
        if (target < 0 || target >= v.equipment.length) return v;
        const next = [...v.equipment];
        [next[index], next[target]] = [next[target], next[index]];
        return { ...v, equipment: next };
      }),
    );

  return {
    variants,
    setVariants,
    addVariant,
    updateVariant,
    deleteVariant,
    moveVariant,
    setDefaultVariant,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    moveIngredient,
    addStep,
    updateStep,
    deleteStep,
    moveStep,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    moveEquipment,
  };
}

export type UseRecipeVariantsReturn = ReturnType<typeof useRecipeVariants>;
