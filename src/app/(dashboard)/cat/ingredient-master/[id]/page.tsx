'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Carrot, Clock, ImageIcon, ListChecks, Package, ShoppingBasket, Tag, Warehouse } from 'lucide-react';

import {
  INGREDIENT_MASTER_STATUS_LABELS,
  IngredientMasterDetail,
  IngredientMasterStatus,
} from '@/modules/cat/ingredient-master/domain/ingredient-master-types';
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

// EM-WP07 — Ingredient Master Workspace.
// Single tab: Overview. Editable in place — Identity, Ingredient Type,
// Base Unit, Purchase Unit, Storage, Shelf Life, Food Characteristics,
// Procurement Category, Description, Optional Image, Status. No
// versioning. No relationship to Recipes, Procurement, or Inventory —
// Ingredients remain independent.
export default function IngredientMasterWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [item, setItem] = useState<IngredientMasterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/ingredient-master/${id}`);
        const data = await res.json();
        if (data.success) {
          setItem(data.item);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to load Ingredient Master Workspace:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const patch = (fields: Partial<IngredientMasterDetail>) => setItem((prev) => (prev ? { ...prev, ...fields } : prev));

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    setError('');
    setSavedAt(null);
    try {
      const res = await fetch(`/api/cat/ingredient-master/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          ingredientType: item.ingredientType,
          baseUnit: item.baseUnit,
          purchaseUnit: item.purchaseUnit,
          storage: item.storage,
          shelfLife: item.shelfLife,
          foodCharacteristics: item.foodCharacteristics,
          procurementCategory: item.procurementCategory,
          description: item.description,
          imageUrl: item.imageUrl,
          status: item.status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setItem(data.item);
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        setError(data.error || 'Failed to save Ingredient.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Ingredient.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Ingredient Master Workspace...</div>;
  }

  if (notFound || !item) {
    return (
      <div className="p-10 text-center space-y-2">
        <Carrot className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <h3 className="text-sm font-bold text-foreground">Ingredient not found.</h3>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      <button
        type="button"
        onClick={() => router.push('/cat/ingredient-master')}
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Ingredient Master</span>
      </button>

      {/* Identity */}
      <Section title="Identity" icon={Carrot}>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Ingredient Code</label>
            <input type="text" value={item.ingredientCode} readOnly disabled className={`${inputClass} font-mono text-muted-foreground bg-muted/30 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Name *</label>
            <input
              type="text"
              value={item.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="e.g. Basmati Rice"
              className={`${inputClass} text-sm font-bold`}
            />
          </div>
        </div>
      </Section>

      {/* Ingredient Type */}
      <Section title="Ingredient Type" icon={Tag}>
        <input
          type="text"
          value={item.ingredientType || ''}
          onChange={(e) => patch({ ingredientType: e.target.value })}
          placeholder="e.g. Grain, Vegetable, Spice, Dairy, Protein"
          className={inputClass}
        />
      </Section>

      {/* Base Unit / Purchase Unit */}
      <Section title="Base Unit" icon={Package}>
        <input
          type="text"
          value={item.baseUnit || ''}
          onChange={(e) => patch({ baseUnit: e.target.value })}
          placeholder="e.g. kg, liter, pcs"
          className={inputClass}
        />
      </Section>

      <Section title="Purchase Unit" icon={ShoppingBasket}>
        <input
          type="text"
          value={item.purchaseUnit || ''}
          onChange={(e) => patch({ purchaseUnit: e.target.value })}
          placeholder="e.g. 50kg bag, case of 24"
          className={inputClass}
        />
      </Section>

      {/* Storage */}
      <Section title="Storage" icon={Warehouse}>
        <input
          type="text"
          value={item.storage || ''}
          onChange={(e) => patch({ storage: e.target.value })}
          placeholder="e.g. Refrigerated, Frozen, Dry Storage"
          className={inputClass}
        />
      </Section>

      {/* Shelf Life */}
      <Section title="Shelf Life" icon={Clock}>
        <input
          type="text"
          value={item.shelfLife || ''}
          onChange={(e) => patch({ shelfLife: e.target.value })}
          placeholder="e.g. 7 days, 6 months"
          className={inputClass}
        />
      </Section>

      {/* Food Characteristics */}
      <Section title="Food Characteristics" icon={ListChecks}>
        <textarea
          rows={2}
          value={item.foodCharacteristics || ''}
          onChange={(e) => patch({ foodCharacteristics: e.target.value })}
          placeholder="e.g. Allergen: nuts, Gluten-free, Perishable"
          className={textareaClass}
        />
      </Section>

      {/* Procurement Category */}
      <Section title="Procurement Category" icon={Tag}>
        <input
          type="text"
          value={item.procurementCategory || ''}
          onChange={(e) => patch({ procurementCategory: e.target.value })}
          placeholder="e.g. Produce, Dry Goods, Meat & Poultry"
          className={inputClass}
        />
      </Section>

      {/* Description */}
      <Section title="Description" icon={ListChecks}>
        <textarea
          rows={4}
          value={item.description || ''}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="Describe this ingredient."
          className={textareaClass}
        />
      </Section>

      {/* Image */}
      <Section title="Image" icon={ImageIcon}>
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
          <select
            value={item.status}
            onChange={(e) => patch({ status: e.target.value as IngredientMasterStatus })}
            className={inputClass}
          >
            {(Object.keys(INGREDIENT_MASTER_STATUS_LABELS) as IngredientMasterStatus[]).map((s) => (
              <option key={s} value={s}>
                {INGREDIENT_MASTER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </Section>

      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

      {/* Action Bar */}
      <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-sm">
          {savedAt ? (
            <span className="font-semibold text-emerald-600">Saved at {savedAt}.</span>
          ) : (
            'Independent master data — not connected to Recipes, Procurement, or Inventory.'
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
