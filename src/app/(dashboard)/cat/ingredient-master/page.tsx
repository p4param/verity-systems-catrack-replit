'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Carrot, CheckCircle2, Layers, Plus, Search, X, XCircle } from 'lucide-react';

import {
  INGREDIENT_MASTER_STATUS_LABELS,
  IngredientMasterStatus,
  IngredientMasterSummary,
} from '@/modules/cat/ingredient-master/domain/ingredient-master-types';

const STATUS_FILTER_OPTIONS: Array<IngredientMasterStatus | ''> = ['', 'ACTIVE', 'INACTIVE'];

const STATUS_BADGE_CLASS: Record<IngredientMasterStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  INACTIVE: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

// EM-WP07 — Ingredient Master Directory.
// Independent organizational master data — not connected to Recipes,
// Procurement, or Inventory. Follows the standard CAT directory pattern
// (KPIs, search, filters, sorting, row navigation) established by the
// Menu Catalog Directory (EM-WP05).
export default function IngredientMasterDirectoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<IngredientMasterSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [ingredientTypeFilter, setIngredientTypeFilter] = useState('');
  const [procurementCategoryFilter, setProcurementCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<IngredientMasterStatus | ''>('');
  const [sort, setSort] = useState('name_asc');

  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIngredientType, setNewIngredientType] = useState('');
  const [newBaseUnit, setNewBaseUnit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [allTypes, setAllTypes] = useState<string[]>([]);
  const [allProcurementCategories, setAllProcurementCategories] = useState<string[]>([]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (ingredientTypeFilter) params.set('ingredientType', ingredientTypeFilter);
      if (procurementCategoryFilter) params.set('procurementCategory', procurementCategoryFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (sort) params.set('sort', sort);

      const res = await fetch(`/api/cat/ingredient-master?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setAllTypes((prev) => Array.from(new Set([...prev, ...(data.items || []).map((i: any) => i.ingredientType).filter(Boolean)])).sort());
        setAllProcurementCategories((prev) =>
          Array.from(new Set([...prev, ...(data.items || []).map((i: any) => i.procurementCategory).filter(Boolean)])).sort(),
        );
      }
    } catch (err) {
      console.error('Failed to fetch Ingredient Master:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, ingredientTypeFilter, procurementCategoryFilter, statusFilter, sort]);

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cat/ingredient-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          ingredientType: newIngredientType.trim() || undefined,
          baseUnit: newBaseUnit.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.item?.id) {
        setShowQuickCreate(false);
        setNewName('');
        setNewIngredientType('');
        setNewBaseUnit('');
        router.push(`/cat/ingredient-master/${data.item.id}`);
      } else {
        alert(`Error creating Ingredient: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const kpis = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.status === 'ACTIVE').length;
    const inactive = items.filter((i) => i.status === 'INACTIVE').length;
    const distinctTypes = new Set(items.map((i) => i.ingredientType).filter(Boolean)).size;
    return { total, active, inactive, distinctTypes };
  }, [items]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* 1. Header & Quick Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border border-border/40 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-0.5">
            <Carrot className="w-3.5 h-3.5" />
            <span>EM-WP07 — Ingredient Master</span>
          </div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Ingredient Master</h1>
        </div>

        <button
          onClick={() => setShowQuickCreate(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Quick Create Ingredient</span>
        </button>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-foreground tracking-tight">{kpis.total}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Total Ingredients</div>
          </div>
          <Carrot className="w-4 h-4 text-primary/70" />
        </div>
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{kpis.active}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Active</div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
        </div>
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-slate-500 tracking-tight">{kpis.inactive}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Inactive</div>
          </div>
          <XCircle className="w-4 h-4 text-slate-400" />
        </div>
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{kpis.distinctTypes}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Ingredient Types</div>
          </div>
          <Layers className="w-4 h-4 text-indigo-500/70" />
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="bg-card p-3 rounded-xl border border-border/40 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, type or procurement category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-muted/30 border border-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg border border-border/40 text-xs">
            <span className="text-[10px] text-muted-foreground font-medium px-2">Status:</span>
            {STATUS_FILTER_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                  statusFilter === s ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === '' ? 'All' : INGREDIENT_MASTER_STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <select
            value={ingredientTypeFilter}
            onChange={(e) => setIngredientTypeFilter(e.target.value)}
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden cursor-pointer"
          >
            <option value="">All Types</option>
            {allTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={procurementCategoryFilter}
            onChange={(e) => setProcurementCategoryFilter(e.target.value)}
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden cursor-pointer"
          >
            <option value="">All Procurement Categories</option>
            {allProcurementCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden cursor-pointer"
          >
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="created_desc">Newest First</option>
            <option value="updated_desc">Recently Updated</option>
          </select>
        </div>
      </div>

      {/* 4. Directory Table */}
      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Ingredient Master...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Carrot className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" />
            <h3 className="text-sm font-bold text-foreground">No Ingredients yet.</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Click &apos;Quick Create Ingredient&apos; to add your first ingredient.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-4">Name</div>
              <div className="col-span-3">Ingredient Type</div>
              <div className="col-span-2">Base Unit</div>
              <div className="col-span-2">Storage</div>
              <div className="col-span-1 text-right">Status</div>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/cat/ingredient-master/${item.id}`)}
                className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-muted/30 transition-colors duration-150 cursor-pointer group"
              >
                <div className="col-span-4 font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">{item.name}</div>
                <div className="col-span-3 text-xs text-muted-foreground truncate">{item.ingredientType || '—'}</div>
                <div className="col-span-2 text-xs text-muted-foreground truncate">{item.baseUnit || '—'}</div>
                <div className="col-span-2 text-xs text-muted-foreground truncate">{item.storage || '—'}</div>
                <div className="col-span-1 text-right">
                  <span
                    className={`inline-flex items-center text-[9px] px-2 py-0.5 font-bold rounded-full border ${STATUS_BADGE_CLASS[item.status]}`}
                  >
                    {INGREDIENT_MASTER_STATUS_LABELS[item.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Quick Create Modal */}
      {showQuickCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border/40 p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Quick Create Ingredient</h3>
                <p className="text-[11px] text-muted-foreground">Fill in the rest in the Workspace.</p>
              </div>
              <button onClick={() => setShowQuickCreate(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Ingredient Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Grain"
                    value={newIngredientType}
                    onChange={(e) => setNewIngredientType(e.target.value)}
                    className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">Base Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. kg"
                    value={newBaseUnit}
                    onChange={(e) => setNewBaseUnit(e.target.value)}
                    className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(false)}
                  className="px-3.5 py-2 bg-muted/60 text-muted-foreground text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Creating...' : 'Create & Open Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
