'use client';

import { useState } from 'react';
import { MenuTreeCategory, MenuTreeItem, MenuTreeMeal } from '@/modules/cat/menu/domain/menu-tree-types';

// EM-WP04 — Menu Templates.
// The Meal -> Category -> Menu Item tree editing state and operations,
// extracted from EM-WP03's EventMenuPlanningWorkspace so both Event Menu
// Planning and Menu Templates edit the identical structure the identical
// way. Purely client-side state — persistence (what table it's saved to)
// is entirely the caller's responsibility.

function blankMeal(): MenuTreeMeal {
  return { id: crypto.randomUUID(), mealName: '', displayOrder: 0, categories: [] };
}
function blankCategory(): MenuTreeCategory {
  return { id: crypto.randomUUID(), categoryName: '', displayOrder: 0, items: [] };
}
function blankItem(): MenuTreeItem {
  return { id: crypto.randomUUID(), itemName: '', quantity: undefined, unit: '', remarks: '', displayOrder: 0 };
}

export function useMenuTree() {
  const [meals, setMeals] = useState<MenuTreeMeal[]>([]);

  // Meal-level operations.
  const addMeal = () => setMeals((prev) => [...prev, blankMeal()]);
  const updateMeal = (mealId: string, patch: Partial<MenuTreeMeal>) =>
    setMeals((prev) => prev.map((m) => (m.id === mealId ? { ...m, ...patch } : m)));
  const deleteMeal = (mealId: string) => setMeals((prev) => prev.filter((m) => m.id !== mealId));
  const moveMeal = (index: number, direction: -1 | 1) =>
    setMeals((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  // Category-level operations (scoped to one meal).
  const addCategory = (mealId: string) =>
    setMeals((prev) => prev.map((m) => (m.id === mealId ? { ...m, categories: [...m.categories, blankCategory()] } : m)));
  const updateCategory = (mealId: string, categoryId: string, patch: Partial<MenuTreeCategory>) =>
    setMeals((prev) =>
      prev.map((m) =>
        m.id === mealId ? { ...m, categories: m.categories.map((c) => (c.id === categoryId ? { ...c, ...patch } : c)) } : m,
      ),
    );
  const deleteCategory = (mealId: string, categoryId: string) =>
    setMeals((prev) => prev.map((m) => (m.id === mealId ? { ...m, categories: m.categories.filter((c) => c.id !== categoryId) } : m)));
  const moveCategory = (mealId: string, index: number, direction: -1 | 1) =>
    setMeals((prev) =>
      prev.map((m) => {
        if (m.id !== mealId) return m;
        const target = index + direction;
        if (target < 0 || target >= m.categories.length) return m;
        const next = [...m.categories];
        [next[index], next[target]] = [next[target], next[index]];
        return { ...m, categories: next };
      }),
    );

  // Item-level operations (scoped to one meal's category). addItem accepts
  // an optional prefill (EM-WP05 — "Choose From Catalog" copies field
  // values in once, here; the added item is a normal free-text row from
  // this point on, with no id or link back to the Catalog).
  const addItem = (mealId: string, categoryId: string, prefill?: Partial<MenuTreeItem>) =>
    setMeals((prev) =>
      prev.map((m) =>
        m.id === mealId
          ? {
              ...m,
              categories: m.categories.map((c) =>
                c.id === categoryId ? { ...c, items: [...c.items, { ...blankItem(), ...prefill }] } : c,
              ),
            }
          : m,
      ),
    );
  const updateItem = (mealId: string, categoryId: string, itemId: string, patch: Partial<MenuTreeItem>) =>
    setMeals((prev) =>
      prev.map((m) =>
        m.id === mealId
          ? {
              ...m,
              categories: m.categories.map((c) =>
                c.id === categoryId ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) } : c,
              ),
            }
          : m,
      ),
    );
  const deleteItem = (mealId: string, categoryId: string, itemId: string) =>
    setMeals((prev) =>
      prev.map((m) =>
        m.id === mealId
          ? { ...m, categories: m.categories.map((c) => (c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c)) }
          : m,
      ),
    );
  const moveItem = (mealId: string, categoryId: string, index: number, direction: -1 | 1) =>
    setMeals((prev) =>
      prev.map((m) => {
        if (m.id !== mealId) return m;
        return {
          ...m,
          categories: m.categories.map((c) => {
            if (c.id !== categoryId) return c;
            const target = index + direction;
            if (target < 0 || target >= c.items.length) return c;
            const next = [...c.items];
            [next[index], next[target]] = [next[target], next[index]];
            return { ...c, items: next };
          }),
        };
      }),
    );

  return {
    meals,
    setMeals,
    addMeal,
    updateMeal,
    deleteMeal,
    moveMeal,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    addItem,
    updateItem,
    deleteItem,
    moveItem,
  };
}

export type UseMenuTreeReturn = ReturnType<typeof useMenuTree>;
