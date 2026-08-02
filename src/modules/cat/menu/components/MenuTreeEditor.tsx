'use client';

import React, { useMemo, useState } from 'react';
import { ChefHat, ChevronDown, ChevronRight, ClipboardCheck, Layers, UtensilsCrossed, Salad } from 'lucide-react';

import { MenuTreeDietaryRequirement, MenuTreeMeal } from '@/modules/cat/menu/domain/menu-tree-types';
import { UseMenuTreeReturn } from '@/modules/cat/menu/hooks/useMenuTree';
import { ListSection, inputClass, textareaClass, useListEditor } from '@/modules/cat/event/components/EventListEditing';

function SummaryCard({
  value,
  label,
  icon: Icon,
  accentClass,
}: {
  value: React.ReactNode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
}) {
  return (
    <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
      <div>
        <div className="text-2xl font-black text-foreground tracking-tight">{value}</div>
        <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">{label}</div>
      </div>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accentClass}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
}

function ServiceInstructionsSummaryCard({ present }: { present: boolean }) {
  return (
    <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
      <div>
        <div
          className={`text-base font-black tracking-tight ${present ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
        >
          {present ? 'Present' : 'None'}
        </div>
        <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Service Instructions</div>
      </div>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          present ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground/60'
        }`}
      >
        <ClipboardCheck className="w-4 h-4" />
      </div>
    </div>
  );
}

interface MenuTreeEditorProps {
  loading: boolean;
  tree: UseMenuTreeReturn;
  dietary: ReturnType<typeof useListEditor<MenuTreeDietaryRequirement>>;
  serviceInstructions: string;
  onServiceInstructionsChange: (value: string) => void;
  title: string;
  titleIcon: React.ComponentType<{ className?: string }>;
  // Optional per-meal badge rendered in the card header next to the Meal
  // Name (e.g. Event Menu Planning shows the Event's guest count; Menu
  // Templates show nothing — Templates aren't tied to any single Event's
  // guest count).
  mealBadge?: (meal: MenuTreeMeal) => React.ReactNode;
  error?: string;
  actionBar: React.ReactNode;
}

// EM-WP04 — Menu Templates.
// The Meals -> Categories -> Menu Items + Dietary Requirements + Service
// Instructions + Menu Summary editing surface, extracted from EM-WP03's
// EventMenuPlanningWorkspace so Event Menu Planning and Menu Templates
// render and behave identically. Purely presentational plus its own
// UI-only category-collapse state — all persistence and the action bar
// itself are the caller's responsibility.
export function MenuTreeEditor({
  loading,
  tree,
  dietary,
  serviceInstructions,
  onServiceInstructionsChange,
  title,
  titleIcon: TitleIcon,
  mealBadge,
  error,
  actionBar,
}: MenuTreeEditorProps) {
  const { meals } = tree;

  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(new Set());
  const toggleCategoryCollapsed = (categoryId: string) =>
    setCollapsedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });

  const summary = useMemo(() => {
    const totalCategories = meals.reduce((sum, m) => sum + m.categories.length, 0);
    const totalItems = meals.reduce((sum, m) => sum + m.categories.reduce((s, c) => s + c.items.length, 0), 0);
    return {
      totalMeals: meals.length,
      totalCategories,
      totalItems,
      dietaryCount: dietary.items.length,
      instructionsPresent: serviceInstructions.trim().length > 0,
    };
  }, [meals, dietary.items, serviceInstructions]);

  return (
    <div className="space-y-4">
      {/* Menu Summary — operational at-a-glance view, updates immediately as the menu is edited. */}
      <div className="space-y-2">
        <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-0.5">Menu Summary</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SummaryCard value={summary.totalMeals} label="Total Meals" icon={UtensilsCrossed} accentClass="bg-indigo-500/10 text-indigo-600" />
          <SummaryCard value={summary.totalCategories} label="Total Categories" icon={Layers} accentClass="bg-blue-500/10 text-blue-600" />
          <SummaryCard value={summary.totalItems} label="Total Menu Items" icon={ChefHat} accentClass="bg-primary/10 text-primary" />
          <SummaryCard value={summary.dietaryCount} label="Dietary Requirements" icon={Salad} accentClass="bg-amber-500/10 text-amber-600" />
          <ServiceInstructionsSummaryCard present={summary.instructionsPresent} />
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border/40 flex items-center gap-2">
          <TitleIcon className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">{title}</h3>
        </div>

        <div className="p-5 space-y-8">
          {/* Meals -> Categories -> Menu Items */}
          <ListSection
            title="Meals"
            helperText="e.g. Lunch, Dinner, Hi-Tea — each Meal groups its own Categories."
            addLabel="Add Meal"
            emptyLabel="No Meals yet."
            items={meals}
            loading={loading}
            onAdd={tree.addMeal}
            onDelete={tree.deleteMeal}
            onMove={tree.moveMeal}
            renderRow={(meal) => (
              <div className="space-y-3">
                {/* Meal card header — Meal Name + optional caller-supplied badge. */}
                <div className="flex items-center justify-between gap-3 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <UtensilsCrossed className="w-4 h-4 text-primary shrink-0" />
                    <input
                      type="text"
                      value={meal.mealName}
                      onChange={(e) => tree.updateMeal(meal.id, { mealName: e.target.value })}
                      placeholder="Meal name (e.g. Lunch, Dinner, Hi-Tea)"
                      className="flex-1 min-w-0 bg-transparent border-none text-sm font-extrabold text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary rounded px-1 py-0.5"
                    />
                  </div>
                  {mealBadge?.(meal)}
                </div>

                <div className="pl-3 border-l-2 border-border/30">
                  <ListSection
                    title="Categories"
                    helperText="e.g. Starters, Main Course, Desserts."
                    addLabel="Add Category"
                    emptyLabel="No Categories yet."
                    items={meal.categories}
                    loading={false}
                    onAdd={() => tree.addCategory(meal.id)}
                    onDelete={(categoryId) => tree.deleteCategory(meal.id, categoryId)}
                    onMove={(index, direction) => tree.moveCategory(meal.id, index, direction)}
                    renderRow={(category) => {
                      const isCollapsed = collapsedCategoryIds.has(category.id);
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleCategoryCollapsed(category.id)}
                              title={isCollapsed ? 'Expand Category' : 'Collapse Category'}
                              className="shrink-0 p-0.5 rounded text-muted-foreground/60 hover:text-foreground cursor-pointer transition"
                            >
                              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <input
                              type="text"
                              value={category.categoryName}
                              onChange={(e) => tree.updateCategory(meal.id, category.id, { categoryName: e.target.value })}
                              placeholder="Category name (e.g. Starters)"
                              className={`${inputClass} font-semibold flex-1`}
                            />
                            <span className="text-[10px] font-semibold text-muted-foreground/70 shrink-0 pr-1">
                              {category.items.length} item{category.items.length === 1 ? '' : 's'}
                            </span>
                          </div>

                          {!isCollapsed && (
                            <div className="pl-3 border-l-2 border-border/20">
                              <ListSection
                                title="Menu Items"
                                helperText="No recipe linkage — name, quantity, unit, and remarks only."
                                addLabel="Add Menu Item"
                                emptyLabel="No Menu Items yet."
                                items={category.items}
                                loading={false}
                                onAdd={() => tree.addItem(meal.id, category.id)}
                                onDelete={(itemId) => tree.deleteItem(meal.id, category.id, itemId)}
                                onMove={(index, direction) => tree.moveItem(meal.id, category.id, index, direction)}
                                renderRow={(item) => (
                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                    <input
                                      type="text"
                                      value={item.itemName}
                                      onChange={(e) => tree.updateItem(meal.id, category.id, item.id, { itemName: e.target.value })}
                                      placeholder="Name"
                                      className={`${inputClass} sm:col-span-2`}
                                    />
                                    <input
                                      type="number"
                                      value={item.quantity ?? ''}
                                      onChange={(e) =>
                                        tree.updateItem(meal.id, category.id, item.id, {
                                          quantity: e.target.value === '' ? undefined : Number(e.target.value),
                                        })
                                      }
                                      placeholder="Quantity"
                                      className={inputClass}
                                    />
                                    <input
                                      type="text"
                                      value={item.unit || ''}
                                      onChange={(e) => tree.updateItem(meal.id, category.id, item.id, { unit: e.target.value })}
                                      placeholder="Unit"
                                      className={inputClass}
                                    />
                                    <textarea
                                      rows={1}
                                      value={item.remarks || ''}
                                      onChange={(e) => tree.updateItem(meal.id, category.id, item.id, { remarks: e.target.value })}
                                      placeholder="Remarks"
                                      className={`${textareaClass} sm:col-span-4`}
                                    />
                                  </div>
                                )}
                              />
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            )}
          />

          {/* Dietary Requirements */}
          <ListSection
            title="Dietary Requirements"
            helperText="Requirement, guest count, and notes."
            addLabel="Add Dietary Requirement"
            emptyLabel="No Dietary Requirements yet."
            items={dietary.items}
            loading={loading}
            onAdd={dietary.add}
            onDelete={dietary.remove}
            onMove={dietary.move}
            renderRow={(item) => (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={item.requirement}
                  onChange={(e) => dietary.update(item.id, { requirement: e.target.value })}
                  placeholder="Requirement (e.g. Vegan)"
                  className={`${inputClass} sm:col-span-2`}
                />
                <input
                  type="number"
                  value={item.guestCount ?? ''}
                  onChange={(e) => dietary.update(item.id, { guestCount: e.target.value === '' ? undefined : Number(e.target.value) })}
                  placeholder="Count"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={item.notes || ''}
                  onChange={(e) => dietary.update(item.id, { notes: e.target.value })}
                  placeholder="Notes"
                  className={inputClass}
                />
              </div>
            )}
          />

          {/* Service Instructions */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Service Instructions</div>
            <textarea
              rows={4}
              value={serviceInstructions}
              onChange={(e) => onServiceInstructionsChange(e.target.value)}
              placeholder="Free-form operational notes for how the menu should be served."
              className={textareaClass}
            />
          </div>

          {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
        </div>

        {/* Workspace Action Bar */}
        <div className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-3 flex-wrap">{actionBar}</div>
      </div>
    </div>
  );
}
