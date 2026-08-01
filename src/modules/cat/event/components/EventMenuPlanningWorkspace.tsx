'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ChefHat,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Layers,
  ListChecks,
  Salad,
  Users,
  UtensilsCrossed,
} from 'lucide-react';

import { EventSummary } from '@/modules/cat/event/domain/event-types';
import {
  EventDietaryRequirement,
  EventMeal,
  EventMenuCategory,
  EventMenuItem,
} from '@/modules/cat/event/domain/event-menu-types';
import { ListSection, inputClass, textareaClass, useListEditor } from '@/modules/cat/event/components/EventListEditing';

interface EventMenuPlanningWorkspaceProps {
  event: EventSummary;
}

function blankMeal(): EventMeal {
  return { id: crypto.randomUUID(), mealName: '', displayOrder: 0, categories: [] };
}
function blankCategory(): EventMenuCategory {
  return { id: crypto.randomUUID(), categoryName: '', displayOrder: 0, items: [] };
}
function blankItem(): EventMenuItem {
  return { id: crypto.randomUUID(), itemName: '', quantity: undefined, unit: '', remarks: '', displayOrder: 0 };
}

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

// EM-WP03 — Menu Planning Workspace.
// Defines WHAT will be served: Event -> Meals -> Categories -> Menu Items,
// plus Dietary Requirements and Service Instructions. No recipe linkage,
// procurement, production, or costing. Editable only — no revisioning, one
// Save action PUTs the full current tree back in a single call. Reuses the
// ListSection/useListEditor pattern established by EM-WP02.
export function EventMenuPlanningWorkspace({ event }: EventMenuPlanningWorkspaceProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [meals, setMeals] = useState<EventMeal[]>([]);
  const dietary = useListEditor<EventDietaryRequirement>(() => ({
    id: crypto.randomUUID(),
    requirement: '',
    guestCount: undefined,
    notes: '',
    displayOrder: 0,
  }));
  const [serviceInstructions, setServiceInstructions] = useState('');

  // Category collapse state — UI-only, not persisted. Categories default
  // expanded (a category id is only ever added here on explicit collapse).
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(new Set());
  const toggleCategoryCollapsed = (categoryId: string) =>
    setCollapsedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/events/${event.id}/menu`);
        const data = await res.json();
        if (data.success) {
          setMeals(data.meals || []);
          dietary.setItems(data.dietaryRequirements || []);
          setServiceInstructions(data.serviceInstructions || '');
        }
      } catch (err) {
        console.error('Failed to load Event Menu:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  // Meal-level operations.
  const addMeal = () => setMeals((prev) => [...prev, blankMeal()]);
  const updateMeal = (mealId: string, patch: Partial<EventMeal>) =>
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
  const updateCategory = (mealId: string, categoryId: string, patch: Partial<EventMenuCategory>) =>
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

  // Item-level operations (scoped to one meal's category).
  const addItem = (mealId: string, categoryId: string) =>
    setMeals((prev) =>
      prev.map((m) =>
        m.id === mealId
          ? { ...m, categories: m.categories.map((c) => (c.id === categoryId ? { ...c, items: [...c.items, blankItem()] } : c)) }
          : m,
      ),
    );
  const updateItem = (mealId: string, categoryId: string, itemId: string, patch: Partial<EventMenuItem>) =>
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

  // Menu Summary — updates immediately, purely derived from local state.
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

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSavedAt(null);
    try {
      const res = await fetch(`/api/cat/events/${event.id}/menu`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meals: meals.map((m) => ({
            id: m.id,
            mealName: m.mealName,
            categories: m.categories.map((c) => ({
              id: c.id,
              categoryName: c.categoryName,
              items: c.items.map((i) => ({ id: i.id, itemName: i.itemName, quantity: i.quantity, unit: i.unit, remarks: i.remarks })),
            })),
          })),
          dietaryRequirements: dietary.items.map((d) => ({ id: d.id, requirement: d.requirement, guestCount: d.guestCount, notes: d.notes })),
          serviceInstructions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMeals(data.meals || []);
        dietary.setItems(data.dietaryRequirements || []);
        setServiceInstructions(data.serviceInstructions || '');
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        setError(data.error || 'Failed to save Menu Planning.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Menu Planning.');
    } finally {
      setSaving(false);
    }
  };

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
          <ListChecks className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">Menu Planning</h3>
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
            onAdd={addMeal}
            onDelete={deleteMeal}
            onMove={moveMeal}
            renderRow={(meal) => (
              <div className="space-y-3">
                {/* Meal card header — Meal Name + Guest Count (the Event's own
                    guest count; Menu Planning has no per-meal scheduling
                    concept, that belongs to Event Planning's Timeline). */}
                <div className="flex items-center justify-between gap-3 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <UtensilsCrossed className="w-4 h-4 text-primary shrink-0" />
                    <input
                      type="text"
                      value={meal.mealName}
                      onChange={(e) => updateMeal(meal.id, { mealName: e.target.value })}
                      placeholder="Meal name (e.g. Lunch, Dinner, Hi-Tea)"
                      className="flex-1 min-w-0 bg-transparent border-none text-sm font-extrabold text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary rounded px-1 py-0.5"
                    />
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground shrink-0 bg-card px-2.5 py-1 rounded-full border border-border/40">
                    <Users className="w-3 h-3" />
                    <span>{event.guestCount != null ? `${event.guestCount} guests` : 'Guest count not set'}</span>
                  </div>
                </div>

                <div className="pl-3 border-l-2 border-border/30">
                  <ListSection
                    title="Categories"
                    helperText="e.g. Starters, Main Course, Desserts."
                    addLabel="Add Category"
                    emptyLabel="No Categories yet."
                    items={meal.categories}
                    loading={false}
                    onAdd={() => addCategory(meal.id)}
                    onDelete={(categoryId) => deleteCategory(meal.id, categoryId)}
                    onMove={(index, direction) => moveCategory(meal.id, index, direction)}
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
                              onChange={(e) => updateCategory(meal.id, category.id, { categoryName: e.target.value })}
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
                                onAdd={() => addItem(meal.id, category.id)}
                                onDelete={(itemId) => deleteItem(meal.id, category.id, itemId)}
                                onMove={(index, direction) => moveItem(meal.id, category.id, index, direction)}
                                renderRow={(item) => (
                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                    <input
                                      type="text"
                                      value={item.itemName}
                                      onChange={(e) => updateItem(meal.id, category.id, item.id, { itemName: e.target.value })}
                                      placeholder="Name"
                                      className={`${inputClass} sm:col-span-2`}
                                    />
                                    <input
                                      type="number"
                                      value={item.quantity ?? ''}
                                      onChange={(e) =>
                                        updateItem(meal.id, category.id, item.id, {
                                          quantity: e.target.value === '' ? undefined : Number(e.target.value),
                                        })
                                      }
                                      placeholder="Quantity"
                                      className={inputClass}
                                    />
                                    <input
                                      type="text"
                                      value={item.unit || ''}
                                      onChange={(e) => updateItem(meal.id, category.id, item.id, { unit: e.target.value })}
                                      placeholder="Unit"
                                      className={inputClass}
                                    />
                                    <textarea
                                      rows={1}
                                      value={item.remarks || ''}
                                      onChange={(e) => updateItem(meal.id, category.id, item.id, { remarks: e.target.value })}
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
              onChange={(e) => setServiceInstructions(e.target.value)}
              placeholder="Free-form operational notes for how the menu should be served."
              className={textareaClass}
            />
          </div>

          {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
        </div>

        {/* Workspace Action Bar */}
        <div className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground max-w-sm">
            {savedAt ? (
              <span className="font-semibold text-emerald-600">Saved at {savedAt}.</span>
            ) : (
              'Internal only — no revisioning, no workflow, no publish.'
            )}
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:opacity-90 transition"
          >
            {saving ? 'Saving...' : 'Save Menu'}
          </button>
        </div>
      </div>
    </div>
  );
}
