'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';

import { MenuTemplateHeader } from '@/modules/cat/menu-template/domain/menu-template-types';
import { MenuTreeDietaryRequirement } from '@/modules/cat/menu/domain/menu-tree-types';
import { useMenuTree } from '@/modules/cat/menu/hooks/useMenuTree';
import { useListEditor } from '@/modules/cat/event/components/EventListEditing';
import { MenuTreeEditor } from '@/modules/cat/menu/components/MenuTreeEditor';

// EM-WP04 — Menu Template Workspace.
// Templates are editable independently after creation — there is no
// concept of a "source Event" here at all once created; this Workspace
// only ever reads/writes cat_menu_template_* tables. Reuses MenuTreeEditor
// (the same Meals -> Categories -> Menu Items + Dietary Requirements +
// Service Instructions + Menu Summary surface EM-WP03 built for Events).
export default function MenuTemplateWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [header, setHeader] = useState<MenuTemplateHeader | null>(null);
  const tree = useMenuTree();
  const dietary = useListEditor<MenuTreeDietaryRequirement>(() => ({
    id: crypto.randomUUID(),
    requirement: '',
    guestCount: undefined,
    notes: '',
    displayOrder: 0,
  }));
  const [serviceInstructions, setServiceInstructions] = useState('');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/menu-templates/${id}`);
        const data = await res.json();
        if (data.success) {
          setHeader(data.template);
          tree.setMeals(data.meals || []);
          dietary.setItems(data.dietaryRequirements || []);
          setServiceInstructions(data.serviceInstructions || '');
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to load Menu Template Workspace:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async () => {
    if (!header) return;
    setSaving(true);
    setError('');
    setSavedAt(null);
    try {
      const res = await fetch(`/api/cat/menu-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: header.templateName,
          description: header.description,
          meals: tree.meals.map((m) => ({
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
        setHeader(data.template);
        tree.setMeals(data.meals || []);
        dietary.setItems(data.dietaryRequirements || []);
        setServiceInstructions(data.serviceInstructions || '');
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        setError(data.error || 'Failed to save Menu Template.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Menu Template.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Menu Template Workspace...</div>;
  }

  if (notFound || !header) {
    return (
      <div className="p-10 text-center space-y-2">
        <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <h3 className="text-sm font-bold text-foreground">Menu Template not found.</h3>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      <button
        type="button"
        onClick={() => router.push('/cat/menu-templates')}
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Menu Template Directory</span>
      </button>

      {/* Template Header — Name and Description are editable inline, saved with the rest of the Workspace. */}
      <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-xs space-y-3">
        <input
          type="text"
          value={header.templateName}
          onChange={(e) => setHeader((prev) => (prev ? { ...prev, templateName: e.target.value } : prev))}
          placeholder="Template Name"
          className="w-full bg-transparent border-none text-2xl font-extrabold text-foreground tracking-tight leading-tight focus:outline-hidden focus:ring-1 focus:ring-primary rounded px-1"
        />
        <textarea
          rows={2}
          value={header.description || ''}
          onChange={(e) => setHeader((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
          placeholder="Optional description — when to use this template."
          className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
        />
      </div>

      <MenuTreeEditor
        loading={loading}
        tree={tree}
        dietary={dietary}
        serviceInstructions={serviceInstructions}
        onServiceInstructionsChange={setServiceInstructions}
        title="Template Menu"
        titleIcon={BookOpen}
        error={error}
        actionBar={
          <>
            <p className="text-[11px] text-muted-foreground max-w-sm">
              {savedAt ? (
                <span className="font-semibold text-emerald-600">Saved at {savedAt}.</span>
              ) : (
                'Editable independently — no revisioning, no link back to any Event.'
              )}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:opacity-90 transition"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </>
        }
      />
    </div>
  );
}
