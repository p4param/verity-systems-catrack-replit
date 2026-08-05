'use client';

import React, { useEffect, useState } from 'react';
import { Boxes, ChevronDown, ChevronRight, ListTree, PackageX, Users2 } from 'lucide-react';

import { EventSummary } from '@/modules/cat/event/domain/event-types';
import { IngredientDemandResponse } from '@/modules/cat/event/domain/ingredient-demand-types';

interface EventIngredientDemandWorkspaceProps {
  event: EventSummary;
}

function fmt(qty: number): string {
  return Number(qty.toFixed(2)).toString();
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

// EM-WP10 — Ingredient Demand Planning.
// Pure read-only report: fetches the aggregated demand once and renders
// three drill levels client-side (Overall -> Meal -> Recipe contribution)
// via expand/collapse — no inputs, no save action, nothing here mutates
// anything. "Meal" is whatever the planner defined in Menu Planning
// (cat_event_meals) — no fixed meal concept.
export function EventIngredientDemandWorkspace({ event }: EventIngredientDemandWorkspaceProps) {
  const [data, setData] = useState<IngredientDemandResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedIngredientKeys, setExpandedIngredientKeys] = useState<Set<string>>(new Set());
  const [expandedMealKeys, setExpandedMealKeys] = useState<Set<string>>(new Set());
  const [showExcluded, setShowExcluded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/cat/events/${event.id}/ingredient-demand`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) setData(json);
        else setError(json.error || 'Failed to load Ingredient Demand.');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load Ingredient Demand.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [event.id]);

  const toggleIngredient = (key: string) =>
    setExpandedIngredientKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleMeal = (key: string) =>
    setExpandedMealKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Ingredient Demand...</div>;
  }
  if (error) {
    return <p className="text-xs text-rose-600 font-semibold">{error}</p>;
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard value={data.summary.uniqueIngredients} label="Unique Ingredients" icon={Boxes} accentClass="bg-primary/10 text-primary" />
        <SummaryCard value={data.summary.mealGroups} label="Meal Groups" icon={ListTree} accentClass="bg-indigo-500/10 text-indigo-600" />
        <SummaryCard value={data.summary.recipeContributions} label="Recipe Contributions" icon={Users2} accentClass="bg-blue-500/10 text-blue-600" />
        <SummaryCard value={data.summary.excludedItemsCount} label="Excluded Items" icon={PackageX} accentClass="bg-amber-500/10 text-amber-600" />
      </div>

      {/* Overall */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border/40">
          <h3 className="text-sm font-extrabold text-foreground">Ingredient Demand — Overall</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Computed from every Menu Item with a linked Recipe and a computable Scale Factor. No unit conversion — the same
            ingredient in two different Recipe Units appears as two rows.
          </p>
        </div>
        <div className="p-5">
          {data.overall.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No ingredient demand yet — link Menu Items to Recipes in Menu Planning.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-12 gap-2 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-5">Ingredient</div>
                <div className="col-span-2">Unit</div>
                <div className="col-span-2 text-right">Total Quantity</div>
                <div className="col-span-2 text-right">Used In</div>
                <div className="col-span-1" />
              </div>
              {data.overall.map((row) => {
                const key = `${row.ingredientId}::${row.unit}`;
                const isExpanded = expandedIngredientKeys.has(key);
                const mealRows = data.mealSubtotals.filter((m) => m.ingredientId === row.ingredientId && m.unit === row.unit);
                return (
                  <div key={key} className="border border-border/40 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleIngredient(key)}
                      className="w-full grid grid-cols-2 sm:grid-cols-12 gap-2 px-3 py-2.5 items-center text-left cursor-pointer hover:bg-muted/20 transition"
                    >
                      <div className="sm:col-span-5 text-xs font-bold text-foreground">{row.ingredientName}</div>
                      <div className="sm:col-span-2 text-xs text-muted-foreground">{row.unit}</div>
                      <div className="sm:col-span-2 text-xs font-semibold text-foreground text-right sm:text-right">{fmt(row.quantity)}</div>
                      <div className="sm:col-span-2 text-[11px] text-muted-foreground text-right">
                        {row.usedInCount} recipe{row.usedInCount === 1 ? '' : 's'}
                      </div>
                      <div className="hidden sm:flex sm:col-span-1 justify-end">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border/30 p-3 space-y-2 bg-muted/10">
                        {mealRows.map((mr) => {
                          const mealKey = `${key}::${mr.mealId}`;
                          const mealExpanded = expandedMealKeys.has(mealKey);
                          const mealName = data.meals.find((m) => m.mealId === mr.mealId)?.mealName || '';
                          const contribRows = data.contributions.filter(
                            (c) => c.mealId === mr.mealId && c.ingredientId === row.ingredientId && c.unit === row.unit,
                          );
                          return (
                            <div key={mealKey} className="rounded-lg bg-card border border-border/30 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleMeal(mealKey)}
                                className="w-full flex items-center justify-between px-3 py-2 text-left cursor-pointer hover:bg-muted/20 transition"
                              >
                                <span className="text-[11px] font-bold text-foreground">{mealName}</span>
                                <span className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-foreground">
                                    {fmt(mr.quantity)} {mr.unit}
                                  </span>
                                  {mealExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                                </span>
                              </button>
                              {mealExpanded && (
                                <div className="border-t border-border/20 px-3 py-2 space-y-1">
                                  {contribRows.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between text-[11px]">
                                      <span className="text-muted-foreground">
                                        {c.itemName}
                                        {c.variantName ? ` — ${c.variantName}` : ''}
                                      </span>
                                      <span className="font-semibold text-foreground">
                                        {fmt(c.quantity)} {c.unit}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Excluded Items */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowExcluded((v) => !v)}
          className="w-full p-4 flex items-center justify-between text-left cursor-pointer"
        >
          <div>
            <h3 className="text-xs font-extrabold text-foreground">Excluded Items ({data.excludedItems.length})</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Menu Items not counted in demand — no Recipe linked, or Quantity/Unit doesn&apos;t match the Recipe&apos;s Yield.
            </p>
          </div>
          {showExcluded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showExcluded && (
          <div className="border-t border-border/40 p-4 space-y-1.5">
            {data.excludedItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">None — every Menu Item with a Recipe is contributing to demand.</p>
            ) : (
              data.excludedItems.map((ex) => (
                <div key={ex.itemId} className="flex items-center justify-between text-[11px] px-1 py-0.5">
                  <span className="text-foreground font-semibold">
                    {ex.itemName} <span className="text-muted-foreground font-normal">— {ex.mealName}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {ex.reason === 'NO_RECIPE_LINKED' ? 'No Recipe linked' : "Quantity/Unit doesn't match Recipe Yield"}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
