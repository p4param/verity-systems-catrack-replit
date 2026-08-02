'use client';

import React, { useEffect, useState } from 'react';
import { ClipboardList, Layers, Plus, Salad, Star, Trash2 } from 'lucide-react';

import { useRecipeVariants } from '@/modules/cat/menu-catalog/hooks/useRecipeVariants';
import { ListSection, inputClass, textareaClass } from '@/modules/cat/event/components/EventListEditing';

interface MenuCatalogRecipesWorkspaceProps {
  catalogItemId: string;
}

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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</div>
      </div>
      {children}
    </div>
  );
}

// EM-WP06 — Recipe Management.
// Recipes define HOW a dish is produced — not procurement, inventory,
// costing, or production execution. A Catalog Item can have multiple
// user-named Recipe Variants; exactly one is the Default Variant. Free-text
// Ingredients only — no Ingredient Master. Reuses the ListSection/
// useListEditor-style pattern established by EM-WP02/03/04. No status,
// revision, workflow, or approval semantics — Save Recipes PUTs the full
// current state of every Variant back in a single call.
export function MenuCatalogRecipesWorkspace({ catalogItemId }: MenuCatalogRecipesWorkspaceProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

  const recipe = useRecipeVariants();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/menu-catalog/${catalogItemId}/recipes`);
        const data = await res.json();
        if (data.success) {
          recipe.setVariants(data.variants || []);
          setActiveVariantId(data.variants?.[0]?.id ?? null);
        }
      } catch (err) {
        console.error('Failed to load Recipes:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogItemId]);

  const handleAddVariant = () => {
    const newId = recipe.addVariant();
    setActiveVariantId(newId);
  };

  const handleDeleteVariant = (variantId: string) => {
    recipe.deleteVariant(variantId);
    if (activeVariantId === variantId) {
      const remaining = recipe.variants.filter((v) => v.id !== variantId);
      setActiveVariantId(remaining[0]?.id ?? null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSavedAt(null);
    try {
      const res = await fetch(`/api/cat/menu-catalog/${catalogItemId}/recipes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variants: recipe.variants.map((v) => ({
            id: v.id,
            variantName: v.variantName,
            isDefault: v.isDefault,
            recipeSummary: v.recipeSummary,
            yieldQuantity: v.yieldQuantity,
            yieldUnit: v.yieldUnit,
            yieldNotes: v.yieldNotes,
            qualityNotes: v.qualityNotes,
            ingredients: v.ingredients.map((i) => ({ id: i.id, ingredientName: i.ingredientName, quantity: i.quantity, unit: i.unit, notes: i.notes })),
            steps: v.steps.map((s) => ({ id: s.id, instruction: s.instruction })),
            equipment: v.equipment.map((e) => ({ id: e.id, equipmentName: e.equipmentName, notes: e.notes })),
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        recipe.setVariants(data.variants || []);
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        setError(data.error || 'Failed to save Recipes.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Recipes.');
    } finally {
      setSaving(false);
    }
  };

  const activeVariant = recipe.variants.find((v) => v.id === activeVariantId) || null;

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Recipes...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Recipe Variant selector */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-xs p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-0.5">Recipe Variants</div>
          <button
            type="button"
            onClick={handleAddVariant}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Variant</span>
          </button>
        </div>
        {recipe.variants.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No Recipe Variants yet. Add one to get started.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {recipe.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveVariantId(v.id)}
                className={`px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  activeVariantId === v.id
                    ? 'bg-primary text-primary-foreground font-extrabold shadow-sm'
                    : 'font-bold text-muted-foreground border border-border/40 hover:border-border hover:text-foreground hover:bg-muted/40'
                }`}
              >
                {v.isDefault && <Star className="w-3 h-3 fill-current" />}
                <span>{v.variantName || 'Untitled Variant'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Variant editor */}
      {activeVariant && (
        <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-border/40 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Variant Name *</label>
              <input
                type="text"
                value={activeVariant.variantName}
                onChange={(e) => recipe.updateVariant(activeVariant.id, { variantName: e.target.value })}
                placeholder="e.g. Standard, Bulk Catering, Vegan"
                className={`${inputClass} font-bold`}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => recipe.setDefaultVariant(activeVariant.id)}
                disabled={activeVariant.isDefault}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition"
              >
                <Star className="w-3.5 h-3.5" />
                {activeVariant.isDefault ? 'Default Variant' : 'Set as Default'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteVariant(activeVariant.id)}
                title="Delete Variant"
                className="p-2 rounded-lg text-muted-foreground/60 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-8">
            {/* 1. Recipe Summary */}
            <Section title="Recipe Summary" icon={ClipboardList}>
              <textarea
                rows={3}
                value={activeVariant.recipeSummary || ''}
                onChange={(e) => recipe.updateVariant(activeVariant.id, { recipeSummary: e.target.value })}
                placeholder="Brief description of this Variant — what makes it distinct, when to use it."
                className={textareaClass}
              />
            </Section>

            {/* 2. Yield */}
            <Section title="Yield" icon={Layers}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Quantity</label>
                  <input
                    type="number"
                    value={activeVariant.yieldQuantity ?? ''}
                    onChange={(e) =>
                      recipe.updateVariant(activeVariant.id, { yieldQuantity: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                    placeholder="e.g. 10"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Unit</label>
                  <input
                    type="text"
                    value={activeVariant.yieldUnit || ''}
                    onChange={(e) => recipe.updateVariant(activeVariant.id, { yieldUnit: e.target.value })}
                    placeholder="e.g. portions, kg"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Notes</label>
                  <input
                    type="text"
                    value={activeVariant.yieldNotes || ''}
                    onChange={(e) => recipe.updateVariant(activeVariant.id, { yieldNotes: e.target.value })}
                    placeholder="e.g. Assumes standard portion size"
                    className={inputClass}
                  />
                </div>
              </div>
            </Section>

            {/* 3. Ingredients */}
            <ListSection
              title="Ingredients"
              helperText="Free-text only — no Ingredient Master. Name, quantity, unit, and notes."
              addLabel="Add Ingredient"
              emptyLabel="No Ingredients yet."
              items={activeVariant.ingredients}
              loading={false}
              onAdd={() => recipe.addIngredient(activeVariant.id)}
              onDelete={(ingredientId) => recipe.deleteIngredient(activeVariant.id, ingredientId)}
              onMove={(index, direction) => recipe.moveIngredient(activeVariant.id, index, direction)}
              renderRow={(ingredient) => (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={ingredient.ingredientName}
                    onChange={(e) => recipe.updateIngredient(activeVariant.id, ingredient.id, { ingredientName: e.target.value })}
                    placeholder="Ingredient"
                    className={`${inputClass} sm:col-span-2`}
                  />
                  <input
                    type="number"
                    value={ingredient.quantity ?? ''}
                    onChange={(e) =>
                      recipe.updateIngredient(activeVariant.id, ingredient.id, {
                        quantity: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder="Quantity"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={ingredient.unit || ''}
                    onChange={(e) => recipe.updateIngredient(activeVariant.id, ingredient.id, { unit: e.target.value })}
                    placeholder="Unit"
                    className={inputClass}
                  />
                  <textarea
                    rows={1}
                    value={ingredient.notes || ''}
                    onChange={(e) => recipe.updateIngredient(activeVariant.id, ingredient.id, { notes: e.target.value })}
                    placeholder="Notes"
                    className={`${textareaClass} sm:col-span-4`}
                  />
                </div>
              )}
            />

            {/* 4. Preparation Steps */}
            <ListSection
              title="Preparation Steps"
              helperText="Ordered — reorder with the arrows."
              addLabel="Add Step"
              emptyLabel="No Preparation Steps yet."
              items={activeVariant.steps}
              loading={false}
              onAdd={() => recipe.addStep(activeVariant.id)}
              onDelete={(stepId) => recipe.deleteStep(activeVariant.id, stepId)}
              onMove={(index, direction) => recipe.moveStep(activeVariant.id, index, direction)}
              renderRow={(step, index) => (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 mt-1.5 text-[10px] font-black text-primary/70 w-5 text-right">{index + 1}.</span>
                  <textarea
                    rows={2}
                    value={step.instruction}
                    onChange={(e) => recipe.updateStep(activeVariant.id, step.id, { instruction: e.target.value })}
                    placeholder="Describe this step."
                    className={`${textareaClass} flex-1`}
                  />
                </div>
              )}
            />

            {/* 5. Equipment & Quality */}
            <ListSection
              title="Equipment"
              helperText="Equipment needed to prepare this Variant."
              addLabel="Add Equipment"
              emptyLabel="No Equipment listed yet."
              items={activeVariant.equipment}
              loading={false}
              onAdd={() => recipe.addEquipment(activeVariant.id)}
              onDelete={(equipmentId) => recipe.deleteEquipment(activeVariant.id, equipmentId)}
              onMove={(index, direction) => recipe.moveEquipment(activeVariant.id, index, direction)}
              renderRow={(equipment) => (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={equipment.equipmentName}
                    onChange={(e) => recipe.updateEquipment(activeVariant.id, equipment.id, { equipmentName: e.target.value })}
                    placeholder="e.g. Tandoor"
                    className={inputClass}
                  />
                  <textarea
                    rows={1}
                    value={equipment.notes || ''}
                    onChange={(e) => recipe.updateEquipment(activeVariant.id, equipment.id, { notes: e.target.value })}
                    placeholder="Notes"
                    className={`${textareaClass} sm:col-span-2`}
                  />
                </div>
              )}
            />

            <Section title="Quality Standards" icon={Salad}>
              <textarea
                rows={3}
                value={activeVariant.qualityNotes || ''}
                onChange={(e) => recipe.updateVariant(activeVariant.id, { qualityNotes: e.target.value })}
                placeholder="e.g. Uniform char marks, internal temperature, plating expectations."
                className={textareaClass}
              />
            </Section>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

      {/* Action Bar */}
      <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-sm">
          {savedAt ? (
            <span className="font-semibold text-emerald-600">Saved at {savedAt}.</span>
          ) : (
            'No versioning, no workflow, no costing, no procurement.'
          )}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:opacity-90 transition"
        >
          {saving ? 'Saving...' : 'Save Recipes'}
        </button>
      </div>
    </div>
  );
}
