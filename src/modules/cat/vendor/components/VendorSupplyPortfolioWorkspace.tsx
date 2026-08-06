'use client';

import React, { useEffect, useState } from 'react';
import { Boxes, Carrot, Star, Trash2 } from 'lucide-react';

import { VendorIngredientLink } from '@/modules/cat/vendor/domain/vendor-supply-portfolio-types';
import { IngredientMasterOption, IngredientMasterPicker } from '@/modules/cat/vendor/components/IngredientMasterPicker';
import { inputClass } from '@/modules/cat/event/components/EventListEditing';

interface VendorSupplyPortfolioWorkspaceProps {
  vendorId: string;
}

// PM-WP01 — Vendor Master, Supply Portfolio tab.
// "What this Vendor supplies," grouped by resource type — only
// "Ingredients" is real in V2.0. The resource-type group heading and
// section structure are already in place so a future resource type
// (Equipment, Packaging, Consumables, Rentals, Transport, Services) is a
// new group in this same tab, per Product Review, not a new top-level tab
// and not a restructure of this one. Read/write via
// /api/cat/vendors/[id]/ingredients — flat add/remove, no reordering.
export function VendorSupplyPortfolioWorkspace({ vendorId }: VendorSupplyPortfolioWorkspaceProps) {
  const [links, setLinks] = useState<VendorIngredientLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/vendors/${vendorId}/ingredients`);
      const data = await res.json();
      if (data.success) setLinks(data.items || []);
      else setError(data.error || 'Failed to load Supply Portfolio.');
    } catch (err: any) {
      setError(err.message || 'Failed to load Supply Portfolio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const handleAdd = async (item: IngredientMasterOption) => {
    setAdding(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/vendors/${vendorId}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientId: item.id }),
      });
      const data = await res.json();
      if (data.success) setLinks(data.items || []);
      else setError(data.error || 'Failed to add Ingredient.');
    } catch (err: any) {
      setError(err.message || 'Failed to add Ingredient.');
    } finally {
      setAdding(false);
    }
  };

  const handleTogglePreferred = async (link: VendorIngredientLink) => {
    const previousPreferred = link.isPreferred;
    const nextPreferred = !previousPreferred;
    setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, isPreferred: nextPreferred } : l)));
    setError('');
    try {
      const res = await fetch(`/api/cat/vendors/${vendorId}/ingredients/${link.ingredientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPreferred: nextPreferred, notes: link.notes }),
      });
      const data = await res.json();
      if (!data.success) {
        setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, isPreferred: previousPreferred } : l)));
        setError(data.error || 'Failed to update preferred flag.');
      }
    } catch (err: any) {
      setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, isPreferred: previousPreferred } : l)));
      setError(err.message || 'Failed to update preferred flag.');
    }
  };

  const handleRemove = async (link: VendorIngredientLink) => {
    setLinks((prev) => prev.filter((l) => l.id !== link.id));
    setError('');
    try {
      const res = await fetch(`/api/cat/vendors/${vendorId}/ingredients/${link.ingredientId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        await load();
        setError(data.error || 'Failed to remove Supply Portfolio entry.');
      }
    } catch (err: any) {
      await load();
      setError(err.message || 'Failed to remove Supply Portfolio entry.');
    }
  };

  const handleNotesBlur = async (link: VendorIngredientLink) => {
    setError('');
    try {
      const res = await fetch(`/api/cat/vendors/${vendorId}/ingredients/${link.ingredientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPreferred: link.isPreferred, notes: link.notes }),
      });
      const data = await res.json();
      if (!data.success) {
        await load();
        setError(data.error || 'Failed to save notes.');
      }
    } catch (err: any) {
      await load();
      setError(err.message || 'Failed to save notes.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border/40 flex items-center gap-2">
          <Boxes className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-sm font-extrabold text-foreground">Supply Portfolio</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              What this Vendor supplies, by resource type. Only Ingredients today — Equipment, Packaging, and other resource types will
              appear here as their own group once built.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Resource-type group: Ingredients */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <Carrot className="w-3.5 h-3.5" />
              <span>Ingredients ({links.length})</span>
            </div>

            <IngredientMasterPicker onSelect={handleAdd} excludeIds={links.map((l) => l.ingredientId)} placeholder="Search Ingredient Master to add to this Vendor's portfolio..." />
            {adding && <p className="text-[11px] text-muted-foreground animate-pulse">Adding...</p>}

            {loading ? (
              <p className="text-xs text-muted-foreground animate-pulse py-4">Loading Supply Portfolio...</p>
            ) : links.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 bg-muted/10 border border-dashed border-border/40 rounded-xl">
                No Ingredients linked yet. Search above to add this Vendor&apos;s Ingredients.
              </p>
            ) : (
              <div className="space-y-1.5">
                {links.map((link) => (
                  <div key={link.id} className="flex items-center gap-3 bg-muted/10 border border-border/30 rounded-lg px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePreferred(link)}
                      title={link.isPreferred ? 'Preferred — click to unset' : 'Mark as preferred'}
                      className="shrink-0 cursor-pointer"
                    >
                      <Star className={`w-4 h-4 ${link.isPreferred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">{link.ingredientName}</span>
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">{link.ingredientCode}</span>
                        {link.baseUnit && <span className="text-[10px] text-muted-foreground shrink-0">• {link.baseUnit}</span>}
                      </div>
                    </div>
                    <div className="w-48 shrink-0">
                      <input
                        type="text"
                        value={link.notes || ''}
                        onChange={(e) => setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, notes: e.target.value } : l)))}
                        onBlur={() => handleNotesBlur(link)}
                        placeholder="Notes (optional)"
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(link)}
                      title="Remove from Supply Portfolio"
                      className="shrink-0 p-1.5 rounded text-muted-foreground/50 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
        </div>
      </div>
    </div>
  );
}
