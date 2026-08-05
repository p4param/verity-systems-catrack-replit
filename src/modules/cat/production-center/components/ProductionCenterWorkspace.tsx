'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ListTree,
  PackageX,
  RefreshCw,
  Search,
  Users2,
  UtensilsCrossed,
} from 'lucide-react';

import { ProductionCenterResponse } from '@/modules/cat/production-center/domain/production-center-types';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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

const inputClass =
  'w-full bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PRODUCTION_READY', label: 'Production Ready' },
];

type SortKey = 'name' | 'quantity';

// EM-WP10A — Production Center. Standalone Operations workspace (not an
// Event Workspace) — daily, multi-Event consolidation of EM-WP10's
// Ingredient Demand via the shared production-demand-engine.ts. Pure
// report: no inputs persist anything, no unit conversion, no manual
// adjustments. Drill-down is one level deeper than EM-WP10: Ingredient ->
// Event -> Meal -> Recipe, reusing the same expand/collapse pattern as
// EventIngredientDemandWorkspace.tsx.
export function ProductionCenterWorkspace() {
  const router = useRouter();
  const [workDate, setWorkDate] = useState(todayIso());
  const [status, setStatus] = useState('ALL');
  const [data, setData] = useState<ProductionCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const [expandedIngredientKeys, setExpandedIngredientKeys] = useState<Set<string>>(new Set());
  const [expandedEventKeys, setExpandedEventKeys] = useState<Set<string>>(new Set());
  const [expandedMealKeys, setExpandedMealKeys] = useState<Set<string>>(new Set());
  const [showExceptions, setShowExceptions] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ workDate, status });
      const res = await fetch(`/api/cat/production-center?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json);
      else setError(json.error || 'Failed to load Production Center.');
    } catch (err: any) {
      setError(err.message || 'Failed to load Production Center.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workDate, status]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  const filteredOverall = useMemo(() => {
    if (!data) return [];
    let rows = data.overall;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.ingredientName.toLowerCase().includes(q) || r.ingredientCode.toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) => (sortKey === 'name' ? a.ingredientName.localeCompare(b.ingredientName) : b.quantity - a.quantity));
    return rows;
  }, [data, search, sortKey]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Production Center</h1>
        <p className="text-xs text-muted-foreground mt-1">What does the kitchen need to produce today, across every Event?</p>
      </div>

      {/* Section 1 — Header */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-xs p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Work Date</label>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
            <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted/60 text-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:bg-muted transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

      {loading && !data ? (
        <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Production Center...</div>
      ) : data ? (
        <>
          {/* Section 2 — Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard value={data.dashboard.events} label="Events" icon={CalendarDays} accentClass="bg-primary/10 text-primary" />
            <SummaryCard value={data.dashboard.guests} label="Guests" icon={Users2} accentClass="bg-indigo-500/10 text-indigo-600" />
            <SummaryCard value={data.dashboard.meals} label="Meals" icon={UtensilsCrossed} accentClass="bg-blue-500/10 text-blue-600" />
            <SummaryCard value={data.dashboard.recipeContributions} label="Recipe Contributions" icon={ListTree} accentClass="bg-emerald-500/10 text-emerald-600" />
            <SummaryCard value={data.dashboard.uniqueIngredients} label="Unique Ingredients" icon={Boxes} accentClass="bg-violet-500/10 text-violet-600" />
            <SummaryCard value={data.dashboard.warnings} label="Warnings" icon={AlertTriangle} accentClass="bg-amber-500/10 text-amber-600" />
          </div>

          {/* Section 3 — Event Summary */}
          <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border/40">
              <h3 className="text-sm font-extrabold text-foreground">Event Summary</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Every Event scheduled on this Work Date. Click a row to open its Event Workspace.</p>
            </div>
            <div className="overflow-x-auto">
              {data.events.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No Events scheduled on this Work Date.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-left">
                      <th className="px-5 py-2">Event Code</th>
                      <th className="px-3 py-2">Event Name</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2 text-right">Guests</th>
                      <th className="px-3 py-2 text-right">Meals</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.events.map((e) => (
                      <tr
                        key={e.id}
                        onClick={() => router.push(`/cat/events/${e.id}`)}
                        className="border-t border-border/30 hover:bg-muted/20 cursor-pointer transition"
                      >
                        <td className="px-5 py-2.5 font-mono text-[10px] text-muted-foreground">{e.eventNumber}</td>
                        <td className="px-3 py-2.5 font-bold text-foreground">{e.eventName}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{e.customerName}</td>
                        <td className="px-3 py-2.5 text-right text-foreground">{e.guestCount ?? '—'}</td>
                        <td className="px-3 py-2.5 text-right text-foreground">{e.mealCount}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-full">{e.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Section 4 — Consolidated Ingredient Demand */}
          <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border/40 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Consolidated Ingredient Demand</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Every Event's Recipe Scaling, consolidated for this Work Date. No unit conversion — the same ingredient in a
                  different Recipe Unit is a separate row.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search ingredient..."
                    className={`${inputClass} pl-8 w-48`}
                  />
                </div>
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={inputClass}>
                  <option value="name">Sort: Name</option>
                  <option value="quantity">Sort: Quantity</option>
                </select>
              </div>
            </div>
            <div className="p-5">
              {filteredOverall.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No consolidated ingredient demand for this Work Date.</p>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-2">Ingredient Code</div>
                    <div className="col-span-3">Ingredient Name</div>
                    <div className="col-span-2 text-right">Required Quantity</div>
                    <div className="col-span-1">Unit</div>
                    <div className="col-span-2 text-right">Used By Events</div>
                    <div className="col-span-1 text-right">Used By Recipes</div>
                    <div className="col-span-1" />
                  </div>
                  {filteredOverall.map((row) => {
                    const ingKey = `${row.ingredientId}::${row.unit}`;
                    const ingExpanded = expandedIngredientKeys.has(ingKey);
                    const eventRows = data.eventSubtotals.filter((s) => s.ingredientId === row.ingredientId && s.unit === row.unit);
                    return (
                      <div key={ingKey} className="border border-border/40 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggle(expandedIngredientKeys, setExpandedIngredientKeys, ingKey)}
                          className="w-full grid grid-cols-2 sm:grid-cols-12 gap-2 px-3 py-2.5 items-center text-left cursor-pointer hover:bg-muted/20 transition"
                        >
                          <div className="sm:col-span-2 font-mono text-[10px] text-muted-foreground">{row.ingredientCode}</div>
                          <div className="sm:col-span-3 text-xs font-bold text-foreground">{row.ingredientName}</div>
                          <div className="sm:col-span-2 text-xs font-semibold text-foreground text-right">{fmt(row.quantity)}</div>
                          <div className="sm:col-span-1 text-xs text-muted-foreground">{row.unit}</div>
                          <div className="sm:col-span-2 text-[11px] text-muted-foreground text-right">{row.usedByEventsCount}</div>
                          <div className="sm:col-span-1 text-[11px] text-muted-foreground text-right">{row.usedByRecipesCount}</div>
                          <div className="hidden sm:flex sm:col-span-1 justify-end">
                            {ingExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                        {ingExpanded && (
                          <div className="border-t border-border/30 p-3 space-y-2 bg-muted/10">
                            {eventRows.map((er) => {
                              const evKey = `${ingKey}::${er.eventId}`;
                              const evExpanded = expandedEventKeys.has(evKey);
                              const eventInfo = data.events.find((e) => e.id === er.eventId);
                              const mealRows = data.mealSubtotals.filter(
                                (m) => m.eventId === er.eventId && m.ingredientId === row.ingredientId && m.unit === row.unit,
                              );
                              return (
                                <div key={evKey} className="rounded-lg bg-card border border-border/30 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => toggle(expandedEventKeys, setExpandedEventKeys, evKey)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-left cursor-pointer hover:bg-muted/20 transition"
                                  >
                                    <span className="text-[11px] font-bold text-foreground">{eventInfo?.eventName || er.eventId}</span>
                                    <span className="flex items-center gap-2">
                                      <span className="text-[11px] font-semibold text-foreground">
                                        {fmt(er.quantity)} {er.unit}
                                      </span>
                                      {evExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                                    </span>
                                  </button>
                                  {evExpanded && (
                                    <div className="border-t border-border/20 p-2.5 space-y-1.5">
                                      {mealRows.map((mr) => {
                                        const mealKey = `${evKey}::${mr.mealId}`;
                                        const mealExpanded = expandedMealKeys.has(mealKey);
                                        const contribRows = data.contributions.filter(
                                          (c) => c.eventId === er.eventId && c.mealId === mr.mealId && c.ingredientId === row.ingredientId && c.unit === row.unit,
                                        );
                                        return (
                                          <div key={mealKey} className="rounded-md bg-muted/10 border border-border/20 overflow-hidden">
                                            <button
                                              type="button"
                                              onClick={() => toggle(expandedMealKeys, setExpandedMealKeys, mealKey)}
                                              className="w-full flex items-center justify-between px-2.5 py-1.5 text-left cursor-pointer hover:bg-muted/20 transition"
                                            >
                                              <span className="text-[11px] font-semibold text-foreground">{mr.mealName}</span>
                                              <span className="flex items-center gap-2">
                                                <span className="text-[11px] font-semibold text-foreground">
                                                  {fmt(mr.quantity)} {mr.unit}
                                                </span>
                                                {mealExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                                              </span>
                                            </button>
                                            {mealExpanded && (
                                              <div className="border-t border-border/20 px-2.5 py-1.5 space-y-1">
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Exceptions */}
          <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
            <button type="button" onClick={() => setShowExceptions((v) => !v)} className="w-full p-4 flex items-center justify-between text-left cursor-pointer">
              <div>
                <h3 className="text-xs font-extrabold text-foreground">Exceptions ({data.dashboard.warnings})</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Unit mismatches, unlinked recipes, and Events missing a menu or demand — read-only.</p>
              </div>
              {showExceptions ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showExceptions && (
              <div className="border-t border-border/40 p-4 space-y-4">
                <ExceptionGroup title="Unit Mismatch" icon={PackageX} items={data.exceptions.unitMismatch.map((x) => `${x.itemName} — ${x.mealName}`)} />
                <ExceptionGroup title="Excluded Recipes (No Recipe Linked)" icon={PackageX} items={data.exceptions.excludedRecipes.map((x) => `${x.itemName} — ${x.mealName}`)} />
                <ExceptionGroup title="Events Missing Menu" icon={AlertTriangle} items={data.exceptions.eventsMissingMenu.map((x) => `${x.eventNumber} — ${x.eventName}`)} />
                <ExceptionGroup
                  title="Events Missing Ingredient Demand"
                  icon={AlertTriangle}
                  items={data.exceptions.eventsMissingIngredientDemand.map((x) => `${x.eventNumber} — ${x.eventName}`)}
                />
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ExceptionGroup({ title, icon: Icon, items }: { title: string; icon: React.ComponentType<{ className?: string }>; items: string[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[11px] font-bold text-foreground">
          {title} ({items.length})
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground pl-5">None.</p>
      ) : (
        <div className="pl-5 space-y-0.5">
          {items.map((item, i) => (
            <p key={i} className="text-[11px] text-muted-foreground">
              {item}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
