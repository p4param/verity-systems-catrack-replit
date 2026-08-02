'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Leaf, Plus, Search, Utensils, X } from 'lucide-react';

import {
  MENU_CATALOG_DIETARY_TYPE_LABELS,
  MENU_CATALOG_STATUS_LABELS,
  MenuCatalogDietaryType,
  MenuCatalogItemSummary,
  MenuCatalogStatus,
} from '@/modules/cat/menu-catalog/domain/menu-catalog-types';

const DIETARY_FILTER_OPTIONS: Array<MenuCatalogDietaryType | ''> = ['', 'VEG', 'NON_VEG', 'EGG', 'VEGAN'];
const STATUS_FILTER_OPTIONS: Array<MenuCatalogStatus | ''> = ['', 'ACTIVE', 'INACTIVE'];

const DIETARY_BADGE_CLASS: Record<MenuCatalogDietaryType, string> = {
  VEG: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  NON_VEG: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  EGG: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  VEGAN: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
};

const STATUS_BADGE_CLASS: Record<MenuCatalogStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  INACTIVE: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

// EM-WP05 — Menu Catalog Directory.
// The organization's reusable menu master data — independent of Events and
// Menu Templates. Follows the standard CAT directory pattern (KPIs,
// search, filters, sorting, row navigation) established by the Events and
// Menu Templates Directories.
export default function MenuCatalogDirectoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<MenuCatalogItemSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<MenuCatalogDietaryType | ''>('');
  const [statusFilter, setStatusFilter] = useState<MenuCatalogStatus | ''>('');
  const [sort, setSort] = useState('name_asc');

  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newCuisine, setNewCuisine] = useState('');
  const [newDietaryType, setNewDietaryType] = useState<MenuCatalogDietaryType>('VEG');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Distinct Category/Cuisine values observed so far, for the filter dropdowns.
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allCuisines, setAllCuisines] = useState<string[]>([]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (categoryFilter) params.set('category', categoryFilter);
      if (cuisineFilter) params.set('cuisine', cuisineFilter);
      if (dietaryFilter) params.set('dietaryType', dietaryFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (sort) params.set('sort', sort);

      const res = await fetch(`/api/cat/menu-catalog?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setAllCategories((prev) => Array.from(new Set([...prev, ...(data.items || []).map((i: any) => i.category).filter(Boolean)])).sort());
        setAllCuisines((prev) => Array.from(new Set([...prev, ...(data.items || []).map((i: any) => i.cuisine).filter(Boolean)])).sort());
      }
    } catch (err) {
      console.error('Failed to fetch Menu Catalog:', err);
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
  }, [query, categoryFilter, cuisineFilter, dietaryFilter, statusFilter, sort]);

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cat/menu-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          category: newCategory.trim() || undefined,
          cuisine: newCuisine.trim() || undefined,
          dietaryType: newDietaryType,
        }),
      });
      const data = await res.json();
      if (data.success && data.item?.id) {
        setShowQuickCreate(false);
        setNewName('');
        setNewCategory('');
        setNewCuisine('');
        setNewDietaryType('VEG');
        router.push(`/cat/menu-catalog/${data.item.id}`);
      } else {
        alert(`Error creating Menu Catalog item: ${data.error}`);
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
    const veg = items.filter((i) => i.dietaryType === 'VEG' || i.dietaryType === 'VEGAN').length;
    const nonVeg = items.filter((i) => i.dietaryType === 'NON_VEG').length;
    return { total, active, veg, nonVeg };
  }, [items]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* 1. Header & Quick Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border border-border/40 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-0.5">
            <Utensils className="w-3.5 h-3.5" />
            <span>EM-WP05 — Menu Catalog</span>
          </div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Menu Catalog</h1>
        </div>

        <button
          onClick={() => setShowQuickCreate(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Quick Create Item</span>
        </button>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-foreground tracking-tight">{kpis.total}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Total Items</div>
          </div>
          <Utensils className="w-4 h-4 text-primary/70" />
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
            <div className="text-2xl font-black text-teal-600 dark:text-teal-400 tracking-tight">{kpis.veg}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Veg / Vegan</div>
          </div>
          <Leaf className="w-4 h-4 text-teal-500/70" />
        </div>
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{kpis.nonVeg}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Non-Veg</div>
          </div>
          <Utensils className="w-4 h-4 text-rose-500/70" />
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="bg-card p-3 rounded-xl border border-border/40 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, category or cuisine..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-muted/30 border border-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg border border-border/40 text-xs">
            <span className="text-[10px] text-muted-foreground font-medium px-2">Diet:</span>
            {DIETARY_FILTER_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDietaryFilter(d)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                  dietaryFilter === d ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {d === '' ? 'All' : MENU_CATALOG_DIETARY_TYPE_LABELS[d]}
              </button>
            ))}
          </div>

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
                {s === '' ? 'All' : MENU_CATALOG_STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden cursor-pointer"
          >
            <option value="">All Categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={cuisineFilter}
            onChange={(e) => setCuisineFilter(e.target.value)}
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden cursor-pointer"
          >
            <option value="">All Cuisines</option>
            {allCuisines.map((c) => (
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
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Menu Catalog...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Utensils className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" />
            <h3 className="text-sm font-bold text-foreground">No Menu Catalog items yet.</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Click &apos;Quick Create Item&apos; to add your first catalog item.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-4">Name</div>
              <div className="col-span-3">Category</div>
              <div className="col-span-2">Cuisine</div>
              <div className="col-span-2">Veg/Non-Veg</div>
              <div className="col-span-1 text-right">Status</div>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/cat/menu-catalog/${item.id}`)}
                className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-muted/30 transition-colors duration-150 cursor-pointer group"
              >
                <div className="col-span-4 font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">{item.name}</div>
                <div className="col-span-3 text-xs text-muted-foreground truncate">{item.category || '—'}</div>
                <div className="col-span-2 text-xs text-muted-foreground truncate">{item.cuisine || '—'}</div>
                <div className="col-span-2">
                  <span
                    className={`inline-flex items-center text-[9px] px-2 py-0.5 font-bold rounded-full border ${DIETARY_BADGE_CLASS[item.dietaryType]}`}
                  >
                    {MENU_CATALOG_DIETARY_TYPE_LABELS[item.dietaryType]}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  <span
                    className={`inline-flex items-center text-[9px] px-2 py-0.5 font-bold rounded-full border ${STATUS_BADGE_CLASS[item.status]}`}
                  >
                    {MENU_CATALOG_STATUS_LABELS[item.status]}
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
                <h3 className="text-sm font-bold text-foreground">Quick Create Menu Catalog Item</h3>
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
                  placeholder="e.g. Butter Chicken"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Course"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">Cuisine</label>
                  <input
                    type="text"
                    placeholder="e.g. North Indian"
                    value={newCuisine}
                    onChange={(e) => setNewCuisine(e.target.value)}
                    className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-foreground mb-1">Veg / Non-Veg</label>
                <select
                  value={newDietaryType}
                  onChange={(e) => setNewDietaryType(e.target.value as MenuCatalogDietaryType)}
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                >
                  {(Object.keys(MENU_CATALOG_DIETARY_TYPE_LABELS) as MenuCatalogDietaryType[]).map((d) => (
                    <option key={d} value={d}>
                      {MENU_CATALOG_DIETARY_TYPE_LABELS[d]}
                    </option>
                  ))}
                </select>
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
