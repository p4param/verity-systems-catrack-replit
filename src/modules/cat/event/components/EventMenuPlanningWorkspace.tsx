'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, BookOpen, Copy, ListChecks, Users } from 'lucide-react';

import { EventSummary } from '@/modules/cat/event/domain/event-types';
import { MenuTreeDietaryRequirement } from '@/modules/cat/menu/domain/menu-tree-types';
import { useMenuTree } from '@/modules/cat/menu/hooks/useMenuTree';
import { MenuTreeEditor } from '@/modules/cat/menu/components/MenuTreeEditor';
import { useListEditor } from '@/modules/cat/event/components/EventListEditing';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EventMenuPlanningWorkspaceProps {
  event: EventSummary;
}

interface MenuTemplateOption {
  id: string;
  templateName: string;
}

interface EventOption {
  id: string;
  eventNumber: string;
  eventName: string;
}

// EM-WP03 — Menu Planning Workspace, extended by EM-WP04 — Menu Templates.
// Defines WHAT will be served: Event -> Meals -> Categories -> Menu Items,
// plus Dietary Requirements and Service Instructions. Save Menu persists
// in-place edits. Save as Template / Apply Template / Copy From Event are
// snapshot-copy operations (new rows, new ids, no live link either
// direction) — see src/lib/cat/menu-snapshot.ts — each requiring explicit
// confirmation since Apply/Copy fully replace the current Event menu.
export function EventMenuPlanningWorkspace({ event }: EventMenuPlanningWorkspaceProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const tree = useMenuTree();
  const dietary = useListEditor<MenuTreeDietaryRequirement>(() => ({
    id: crypto.randomUUID(),
    requirement: '',
    guestCount: undefined,
    notes: '',
    displayOrder: 0,
  }));
  const [serviceInstructions, setServiceInstructions] = useState('');

  // Save as Template dialog state.
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveTemplateError, setSaveTemplateError] = useState('');
  const [savedTemplate, setSavedTemplate] = useState<{ id: string; templateName: string } | null>(null);

  // Apply Template dialog state.
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [templateOptions, setTemplateOptions] = useState<MenuTemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [applyTemplateError, setApplyTemplateError] = useState('');

  // Copy From Event dialog state.
  const [showCopyFromEvent, setShowCopyFromEvent] = useState(false);
  const [eventOptions, setEventOptions] = useState<EventOption[]>([]);
  const [selectedSourceEventId, setSelectedSourceEventId] = useState('');
  const [copyingFromEvent, setCopyingFromEvent] = useState(false);
  const [copyFromEventError, setCopyFromEventError] = useState('');

  const loadMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cat/events/${event.id}/menu`);
      const data = await res.json();
      if (data.success) {
        tree.setMeals(data.meals || []);
        dietary.setItems(data.dietaryRequirements || []);
        setServiceInstructions(data.serviceInstructions || '');
      }
    } catch (err) {
      console.error('Failed to load Event Menu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSavedAt(null);
    try {
      const res = await fetch(`/api/cat/events/${event.id}/menu`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meals: tree.meals.map((m) => ({
            id: m.id,
            mealName: m.mealName,
            categories: m.categories.map((c) => ({
              id: c.id,
              categoryName: c.categoryName,
              items: c.items.map((i) => ({
                id: i.id,
                itemName: i.itemName,
                quantity: i.quantity,
                unit: i.unit,
                remarks: i.remarks,
                catalogItemId: i.catalogItemId,
                recipeVariantId: i.recipeVariantId,
              })),
            })),
          })),
          dietaryRequirements: dietary.items.map((d) => ({ id: d.id, requirement: d.requirement, guestCount: d.guestCount, notes: d.notes })),
          serviceInstructions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        tree.setMeals(data.meals || []);
        dietary.setItems(data.dietaryRequirements || []);
        setServiceInstructions(data.serviceInstructions || '');
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        setError(data.error || 'Failed to save Menu Planning.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Menu Planning.');
    } finally {
      setSaving(false);
    }
  };

  const openSaveAsTemplate = () => {
    setNewTemplateName('');
    setNewTemplateDescription('');
    setSaveTemplateError('');
    setSavedTemplate(null);
    setShowSaveAsTemplate(true);
  };

  const handleSaveAsTemplate = async (e: React.MouseEvent) => {
    e.preventDefault(); // keep the dialog open through the async call — AlertDialogAction closes on click by default.
    if (!newTemplateName.trim()) {
      setSaveTemplateError('Template Name is required.');
      return;
    }
    setSavingTemplate(true);
    setSaveTemplateError('');
    try {
      const res = await fetch(`/api/cat/events/${event.id}/menu/save-as-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateName: newTemplateName, description: newTemplateDescription || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedTemplate(data.template);
      } else {
        setSaveTemplateError(data.error || 'Failed to save Event as Template.');
      }
    } catch (err: any) {
      setSaveTemplateError(err.message || 'Failed to save Event as Template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const openApplyTemplate = async () => {
    setSelectedTemplateId('');
    setApplyTemplateError('');
    setShowApplyTemplate(true);
    try {
      const res = await fetch('/api/cat/menu-templates');
      const data = await res.json();
      if (data.success) setTemplateOptions((data.items || []).map((t: any) => ({ id: t.id, templateName: t.templateName })));
    } catch (err) {
      console.error('Failed to load Menu Templates for Apply Template:', err);
    }
  };

  const handleApplyTemplate = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      setApplyTemplateError('Choose a Template to apply.');
      return;
    }
    setApplyingTemplate(true);
    setApplyTemplateError('');
    try {
      const res = await fetch(`/api/cat/events/${event.id}/menu/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId }),
      });
      const data = await res.json();
      if (data.success) {
        tree.setMeals(data.meals || []);
        dietary.setItems(data.dietaryRequirements || []);
        setServiceInstructions(data.serviceInstructions || '');
        setSavedAt(new Date().toLocaleTimeString());
        setShowApplyTemplate(false);
      } else {
        setApplyTemplateError(data.error || 'Failed to apply Menu Template.');
      }
    } catch (err: any) {
      setApplyTemplateError(err.message || 'Failed to apply Menu Template.');
    } finally {
      setApplyingTemplate(false);
    }
  };

  const openCopyFromEvent = async () => {
    setSelectedSourceEventId('');
    setCopyFromEventError('');
    setShowCopyFromEvent(true);
    try {
      const res = await fetch('/api/cat/events');
      const data = await res.json();
      if (data.success) {
        setEventOptions(
          (data.items || [])
            .filter((e: any) => e.id !== event.id)
            .map((e: any) => ({ id: e.id, eventNumber: e.eventNumber, eventName: e.eventName })),
        );
      }
    } catch (err) {
      console.error('Failed to load Events for Copy From Event:', err);
    }
  };

  const handleCopyFromEvent = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedSourceEventId) {
      setCopyFromEventError('Choose a source Event to copy from.');
      return;
    }
    setCopyingFromEvent(true);
    setCopyFromEventError('');
    try {
      const res = await fetch(`/api/cat/events/${event.id}/menu/copy-from-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceEventId: selectedSourceEventId }),
      });
      const data = await res.json();
      if (data.success) {
        tree.setMeals(data.meals || []);
        dietary.setItems(data.dietaryRequirements || []);
        setServiceInstructions(data.serviceInstructions || '');
        setSavedAt(new Date().toLocaleTimeString());
        setShowCopyFromEvent(false);
      } else {
        setCopyFromEventError(data.error || 'Failed to copy menu from Event.');
      }
    } catch (err: any) {
      setCopyFromEventError(err.message || 'Failed to copy menu from Event.');
    } finally {
      setCopyingFromEvent(false);
    }
  };

  return (
    <>
      <MenuTreeEditor
        loading={loading}
        tree={tree}
        dietary={dietary}
        serviceInstructions={serviceInstructions}
        onServiceInstructionsChange={setServiceInstructions}
        title="Menu Planning"
        titleIcon={ListChecks}
        error={error}
        showRecipeScaling
        mealBadge={(meal) => (
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground shrink-0 bg-card px-2.5 py-1 rounded-full border border-border/40">
            <Users className="w-3 h-3" />
            <span>{event.guestCount != null ? `${event.guestCount} guests` : 'Guest count not set'}</span>
          </div>
        )}
        actionBar={
          <>
            <p className="text-[11px] text-muted-foreground max-w-sm">
              {savedAt ? (
                <span className="font-semibold text-emerald-600">Saved at {savedAt}.</span>
              ) : (
                'Internal only — no revisioning, no workflow, no publish.'
              )}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={openCopyFromEvent}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted/60 text-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:bg-muted transition"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy From Event
              </button>
              <button
                type="button"
                onClick={openApplyTemplate}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted/60 text-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:bg-muted transition"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Apply Template
              </button>
              <button
                type="button"
                onClick={openSaveAsTemplate}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted/60 text-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:bg-muted transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Save as Template
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:opacity-90 transition"
              >
                {saving ? 'Saving...' : 'Save Menu'}
              </button>
            </div>
          </>
        }
      />

      {/* Save as Template */}
      <AlertDialog open={showSaveAsTemplate} onOpenChange={setShowSaveAsTemplate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save as Template</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1">
                {savedTemplate ? (
                  <p className="text-xs text-emerald-600 font-semibold">
                    Template &quot;{savedTemplate.templateName}&quot; created from this Event&apos;s current saved menu.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Creates a new, independent Menu Template from this Event&apos;s current saved menu. Later edits to either side will
                      never affect the other. If you have unsaved changes, click Save Menu first.
                    </p>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Template Name *</label>
                      <input
                        type="text"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="e.g. Standard Wedding Menu"
                        className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={newTemplateDescription}
                        onChange={(e) => setNewTemplateDescription(e.target.value)}
                        placeholder="Optional context for when to use this template."
                        className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                      />
                    </div>
                    {saveTemplateError && <p className="text-xs text-rose-600 font-semibold">{saveTemplateError}</p>}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {savedTemplate ? (
              <>
                <AlertDialogCancel>Close</AlertDialogCancel>
                <AlertDialogAction onClick={() => router.push(`/cat/menu-templates/${savedTemplate.id}`)}>
                  Open Template
                </AlertDialogAction>
              </>
            ) : (
              <>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSaveAsTemplate} disabled={savingTemplate}>
                  {savingTemplate ? 'Saving...' : 'Save as Template'}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apply Template */}
      <AlertDialog open={showApplyTemplate} onOpenChange={setShowApplyTemplate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Template</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p className="text-xs text-rose-600 font-semibold">
                  This replaces this Event&apos;s current menu entirely with a copy of the selected Template. This cannot be undone.
                </p>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Menu Template *</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  >
                    <option value="">Select a Template...</option>
                    {templateOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.templateName}
                      </option>
                    ))}
                  </select>
                  {templateOptions.length === 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">No Menu Templates exist yet.</p>
                  )}
                </div>
                {applyTemplateError && <p className="text-xs text-rose-600 font-semibold">{applyTemplateError}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyTemplate} disabled={applyingTemplate || !selectedTemplateId}>
              {applyingTemplate ? 'Applying...' : 'Replace Menu'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy From Event */}
      <AlertDialog open={showCopyFromEvent} onOpenChange={setShowCopyFromEvent}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy From Existing Event</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p className="text-xs text-rose-600 font-semibold">
                  This replaces this Event&apos;s current menu entirely with a copy of the selected Event&apos;s menu. This cannot be
                  undone.
                </p>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Source Event *</label>
                  <select
                    value={selectedSourceEventId}
                    onChange={(e) => setSelectedSourceEventId(e.target.value)}
                    className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  >
                    <option value="">Select an Event...</option>
                    {eventOptions.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.eventNumber} — {e.eventName}
                      </option>
                    ))}
                  </select>
                  {eventOptions.length === 0 && <p className="text-[11px] text-muted-foreground mt-1">No other Events exist yet.</p>}
                </div>
                {copyFromEventError && <p className="text-xs text-rose-600 font-semibold">{copyFromEventError}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCopyFromEvent} disabled={copyingFromEvent || !selectedSourceEventId}>
              {copyingFromEvent ? 'Copying...' : 'Replace Menu'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
