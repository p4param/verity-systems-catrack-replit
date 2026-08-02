'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ChefHat, Layers, Plus, Salad, Search, UtensilsCrossed, X } from 'lucide-react';

interface MenuTemplateListRow {
  id: string;
  templateName: string;
  description?: string;
  totalMeals: number;
  totalCategories: number;
  totalItems: number;
  dietaryCount: number;
  createdAt: string;
  updatedAt: string;
}

// EM-WP04 — Menu Templates Directory.
// Menu Templates are first-class business entities, not a hidden utility
// of Event Menu Planning: their own Directory here, following the same
// KPI/search/table/Quick-Create convention as the Events Directory
// (EM-WP01), plus their own Workspace (src/app/(dashboard)/cat/menu-templates/[id]/page.tsx).
export default function MenuTemplatesDirectoryPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<MenuTemplateListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTemplates = async (searchQuery: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('query', searchQuery);
      const res = await fetch(`/api/cat/menu-templates?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setTemplates(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch Menu Templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchTemplates(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cat/menu-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateName: newName, description: newDescription.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success && data.template?.id) {
        setShowQuickCreate(false);
        setNewName('');
        setNewDescription('');
        router.push(`/cat/menu-templates/${data.template.id}`);
      } else {
        alert(`Error creating Menu Template: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalTemplates = templates.length;
  const totalMeals = templates.reduce((sum, t) => sum + t.totalMeals, 0);
  const totalCategories = templates.reduce((sum, t) => sum + t.totalCategories, 0);
  const totalItems = templates.reduce((sum, t) => sum + t.totalItems, 0);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* 1. Header & Quick Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border border-border/40 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-0.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>EM-WP04 — Menu Templates</span>
          </div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Menu Template Directory</h1>
        </div>

        <button
          onClick={() => setShowQuickCreate(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Quick Create Template</span>
        </button>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-foreground tracking-tight">{totalTemplates}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Total Templates</div>
          </div>
          <BookOpen className="w-4 h-4 text-primary/70" />
        </div>
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{totalMeals}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Total Meals</div>
          </div>
          <UtensilsCrossed className="w-4 h-4 text-indigo-500/70" />
        </div>
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{totalCategories}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Total Categories</div>
          </div>
          <Layers className="w-4 h-4 text-blue-500/70" />
        </div>
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{totalItems}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Total Menu Items</div>
          </div>
          <ChefHat className="w-4 h-4 text-emerald-500/70" />
        </div>
      </div>

      {/* 3. Search Toolbar */}
      <div className="bg-card p-3 rounded-xl border border-border/40 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search template name or description..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-muted/30 border border-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* 4. Directory Table */}
      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Menu Template Directory...</div>
        ) : templates.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" />
            <h3 className="text-sm font-bold text-foreground">No Menu Templates yet.</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Click &apos;Quick Create Template&apos; to start one, or use &apos;Save as Template&apos; from any Event&apos;s Menu Planning workspace.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-4">Template Name</div>
              <div className="col-span-2 text-right">Meals</div>
              <div className="col-span-2 text-right">Categories</div>
              <div className="col-span-2 text-right">Menu Items</div>
              <div className="col-span-2 text-right">Dietary Reqs.</div>
            </div>

            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => router.push(`/cat/menu-templates/${t.id}`)}
                className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-muted/30 transition-colors duration-150 cursor-pointer group"
              >
                <div className="col-span-4 min-w-0">
                  <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">{t.templateName}</div>
                  {t.description && <div className="text-[10px] text-muted-foreground truncate mt-0.5">{t.description}</div>}
                </div>
                <div className="col-span-2 text-right text-xs font-semibold text-foreground">{t.totalMeals}</div>
                <div className="col-span-2 text-right text-xs font-semibold text-foreground">{t.totalCategories}</div>
                <div className="col-span-2 text-right text-xs font-semibold text-foreground">{t.totalItems}</div>
                <div className="col-span-2 text-right text-xs font-semibold text-foreground flex items-center justify-end gap-1">
                  <Salad className="w-3 h-3 text-amber-500/70" />
                  {t.dietaryCount}
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
                <h3 className="text-sm font-bold text-foreground">Quick Create Menu Template</h3>
                <p className="text-[11px] text-muted-foreground">Starts empty — build out Meals, Categories, and Items in the Workspace.</p>
              </div>
              <button onClick={() => setShowQuickCreate(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Wedding Menu"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-foreground mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional context for when to use this template."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                />
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
