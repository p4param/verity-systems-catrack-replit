'use client';

import React, { useState } from 'react';
import { ImageIcon, ListChecks, Salad, Tag, Utensils } from 'lucide-react';

import {
  MENU_CATALOG_DIETARY_TYPE_LABELS,
  MENU_CATALOG_STATUS_LABELS,
  MenuCatalogDietaryType,
  MenuCatalogItemDetail,
  MenuCatalogStatus,
} from '@/modules/cat/menu-catalog/domain/menu-catalog-types';
import { inputClass, textareaClass } from '@/modules/cat/event/components/EventListEditing';

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-extrabold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

interface MenuCatalogOverviewWorkspaceProps {
  item: MenuCatalogItemDetail;
  onSaved: (item: MenuCatalogItemDetail) => void;
}

// EM-WP05 — Menu Catalog Overview. Extracted from the Workspace page in
// EM-WP06 so the page can switch between Overview and Recipes tabs.
// Editable in place — Identity, Classification, Dietary, Service,
// Description, Optional Image, Status. No versioning. Catalog edits here
// never affect an Event or Template that already added this item "From
// Catalog" — that copy happens once, at add-time, in the Event/Template's
// own menu tables.
export function MenuCatalogOverviewWorkspace({ item: initialItem, onSaved }: MenuCatalogOverviewWorkspaceProps) {
  const [item, setItem] = useState<MenuCatalogItemDetail>(initialItem);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const patch = (fields: Partial<MenuCatalogItemDetail>) => setItem((prev) => ({ ...prev, ...fields }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSavedAt(null);
    try {
      const res = await fetch(`/api/cat/menu-catalog/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          category: item.category,
          cuisine: item.cuisine,
          dietaryType: item.dietaryType,
          dietaryNotes: item.dietaryNotes,
          defaultUnit: item.defaultUnit,
          servingNotes: item.servingNotes,
          description: item.description,
          imageUrl: item.imageUrl,
          status: item.status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setItem(data.item);
        onSaved(data.item);
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        setError(data.error || 'Failed to save Menu Catalog item.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Menu Catalog item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Identity */}
      <Section title="Identity" icon={Utensils}>
        <div>
          <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Name *</label>
          <input
            type="text"
            value={item.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="e.g. Butter Chicken"
            className={`${inputClass} text-sm font-bold`}
          />
        </div>
      </Section>

      {/* Classification */}
      <Section title="Classification" icon={Tag}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Category</label>
            <input
              type="text"
              value={item.category || ''}
              onChange={(e) => patch({ category: e.target.value })}
              placeholder="e.g. Main Course"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Cuisine</label>
            <input
              type="text"
              value={item.cuisine || ''}
              onChange={(e) => patch({ cuisine: e.target.value })}
              placeholder="e.g. North Indian"
              className={inputClass}
            />
          </div>
        </div>
      </Section>

      {/* Dietary */}
      <Section title="Dietary" icon={Salad}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Veg / Non-Veg *</label>
            <select
              value={item.dietaryType}
              onChange={(e) => patch({ dietaryType: e.target.value as MenuCatalogDietaryType })}
              className={inputClass}
            >
              {(Object.keys(MENU_CATALOG_DIETARY_TYPE_LABELS) as MenuCatalogDietaryType[]).map((d) => (
                <option key={d} value={d}>
                  {MENU_CATALOG_DIETARY_TYPE_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Dietary Notes</label>
            <input
              type="text"
              value={item.dietaryNotes || ''}
              onChange={(e) => patch({ dietaryNotes: e.target.value })}
              placeholder="e.g. Contains nuts"
              className={inputClass}
            />
          </div>
        </div>
      </Section>

      {/* Service */}
      <Section title="Service" icon={ListChecks}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Default Unit</label>
            <input
              type="text"
              value={item.defaultUnit || ''}
              onChange={(e) => patch({ defaultUnit: e.target.value })}
              placeholder="e.g. kg, plate, pcs"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Serving Notes</label>
            <input
              type="text"
              value={item.servingNotes || ''}
              onChange={(e) => patch({ servingNotes: e.target.value })}
              placeholder="e.g. Serve in a chafing dish"
              className={inputClass}
            />
          </div>
        </div>
      </Section>

      {/* Description */}
      <Section title="Description" icon={ListChecks}>
        <textarea
          rows={4}
          value={item.description || ''}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="Describe this menu item."
          className={textareaClass}
        />
      </Section>

      {/* Optional Image */}
      <Section title="Optional Image" icon={ImageIcon}>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Image URL</label>
            <input
              type="text"
              value={item.imageUrl || ''}
              onChange={(e) => patch({ imageUrl: e.target.value })}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          {item.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-32 h-32 object-cover rounded-lg border border-border/40"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          )}
        </div>
      </Section>

      {/* Status */}
      <Section title="Status" icon={ListChecks}>
        <div>
          <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Status *</label>
          <select value={item.status} onChange={(e) => patch({ status: e.target.value as MenuCatalogStatus })} className={inputClass}>
            {(Object.keys(MENU_CATALOG_STATUS_LABELS) as MenuCatalogStatus[]).map((s) => (
              <option key={s} value={s}>
                {MENU_CATALOG_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Inactive items stay in the Catalog for reference but won&apos;t be offered when adding a Menu Item &quot;From Catalog&quot;.
          </p>
        </div>
      </Section>

      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

      {/* Action Bar */}
      <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-sm">
          {savedAt ? (
            <span className="font-semibold text-emerald-600">Saved at {savedAt}.</span>
          ) : (
            'Editing this Catalog item never affects Events or Templates that already used it — those are snapshot copies.'
          )}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:opacity-90 transition"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
