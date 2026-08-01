'use client';

import React, { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';

import { EventSummary } from '@/modules/cat/event/domain/event-types';
import {
  EventKeyContact,
  EventPlanningChecklistItem,
  EventPlanningSummary,
  EventRisk,
  EventTimelineItem,
} from '@/modules/cat/event/domain/event-planning-types';
import { ListSection, inputClass, textareaClass, useListEditor } from '@/modules/cat/event/components/EventListEditing';

interface EventPlanningWorkspaceProps {
  event: EventSummary;
}

// EM-WP02 — Event Planning Workspace.
// The operational planning brief: Operational Summary, Event Timeline, Key
// Contacts, Operational Notes, Risks & Special Instructions, and Planning
// Checklist. Editable only — no status, no revision history, no workflow,
// no approvals, no publish. One GET loads everything; one Save Planning
// button PUTs the full current state back in a single call.
export function EventPlanningWorkspace({ event }: EventPlanningWorkspaceProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [summary, setSummary] = useState<EventPlanningSummary>({});
  const timeline = useListEditor<EventTimelineItem>(() => ({
    id: crypto.randomUUID(),
    timeLabel: '',
    activity: '',
    responsibleParty: '',
    notes: '',
    displayOrder: 0,
  }));
  const contacts = useListEditor<EventKeyContact>(() => ({
    id: crypto.randomUUID(),
    contactName: '',
    role: '',
    phone: '',
    email: '',
    notes: '',
    displayOrder: 0,
  }));
  const risks = useListEditor<EventRisk>(() => ({ id: crypto.randomUUID(), statement: '', displayOrder: 0 }));
  const checklist = useListEditor<EventPlanningChecklistItem>(() => ({
    id: crypto.randomUUID(),
    itemText: '',
    isComplete: false,
    displayOrder: 0,
  }));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/events/${event.id}/planning`);
        const data = await res.json();
        if (data.success) {
          setSummary(data.summary || {});
          timeline.setItems(data.timeline || []);
          contacts.setItems(data.contacts || []);
          risks.setItems(data.risks || []);
          checklist.setItems(data.checklist || []);
        }
      } catch (err) {
        console.error('Failed to load Event Planning:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSavedAt(null);
    try {
      const res = await fetch(`/api/cat/events/${event.id}/planning`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          timeline: timeline.items.map((t) => ({
            id: t.id,
            timeLabel: t.timeLabel,
            activity: t.activity,
            responsibleParty: t.responsibleParty,
            notes: t.notes,
          })),
          contacts: contacts.items.map((c) => ({
            id: c.id,
            contactName: c.contactName,
            role: c.role,
            phone: c.phone,
            email: c.email,
            notes: c.notes,
          })),
          risks: risks.items.map((r) => ({ id: r.id, statement: r.statement })),
          checklist: checklist.items.map((c) => ({ id: c.id, itemText: c.itemText, isComplete: c.isComplete })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary || {});
        timeline.setItems(data.timeline || []);
        contacts.setItems(data.contacts || []);
        risks.setItems(data.risks || []);
        checklist.setItems(data.checklist || []);
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        setError(data.error || 'Failed to save Event Planning.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Event Planning.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-extrabold text-foreground">Event Planning</h3>
      </div>

      <div className="p-5 space-y-8">
        {/* 1. Operational Summary */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Operational Summary</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Operations Owner</label>
              <input
                type="text"
                value={summary.operationsOwner || ''}
                onChange={(e) => setSummary((prev) => ({ ...prev, operationsOwner: e.target.value }))}
                placeholder="e.g. Ravi Kumar"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Contact Phone</label>
              <input
                type="text"
                value={summary.operationsContactPhone || ''}
                onChange={(e) => setSummary((prev) => ({ ...prev, operationsContactPhone: e.target.value }))}
                placeholder="e.g. +91 98765 43210"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Contact Email</label>
              <input
                type="text"
                value={summary.operationsContactEmail || ''}
                onChange={(e) => setSummary((prev) => ({ ...prev, operationsContactEmail: e.target.value }))}
                placeholder="e.g. ops@company.com"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Operational Brief</label>
            <textarea
              rows={3}
              value={summary.operationalSummary || ''}
              onChange={(e) => setSummary((prev) => ({ ...prev, operationalSummary: e.target.value }))}
              placeholder="High-level operational brief for the team executing this event."
              className={textareaClass}
            />
          </div>
        </div>

        {/* 2. Event Timeline */}
        <ListSection
          title="Event Timeline"
          helperText="Chronological run-of-show for the operations team."
          addLabel="Add Timeline Entry"
          emptyLabel="No Timeline entries yet."
          items={timeline.items}
          loading={loading}
          onAdd={timeline.add}
          onDelete={timeline.remove}
          onMove={timeline.move}
          renderRow={(item) => (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                value={item.timeLabel}
                onChange={(e) => timeline.update(item.id, { timeLabel: e.target.value })}
                placeholder="e.g. 4:00 PM"
                className={inputClass}
              />
              <input
                type="text"
                value={item.activity}
                onChange={(e) => timeline.update(item.id, { activity: e.target.value })}
                placeholder="Activity"
                className={`${inputClass} sm:col-span-2`}
              />
              <input
                type="text"
                value={item.responsibleParty || ''}
                onChange={(e) => timeline.update(item.id, { responsibleParty: e.target.value })}
                placeholder="Responsible party"
                className={inputClass}
              />
              <textarea
                rows={1}
                value={item.notes || ''}
                onChange={(e) => timeline.update(item.id, { notes: e.target.value })}
                placeholder="Notes"
                className={`${textareaClass} sm:col-span-4`}
              />
            </div>
          )}
        />

        {/* 3. Key Contacts */}
        <ListSection
          title="Key Contacts"
          helperText="Who to reach on the ground for this event."
          addLabel="Add Contact"
          emptyLabel="No Key Contacts yet."
          items={contacts.items}
          loading={loading}
          onAdd={contacts.add}
          onDelete={contacts.remove}
          onMove={contacts.move}
          renderRow={(item) => (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                value={item.contactName}
                onChange={(e) => contacts.update(item.id, { contactName: e.target.value })}
                placeholder="Name"
                className={inputClass}
              />
              <input
                type="text"
                value={item.role || ''}
                onChange={(e) => contacts.update(item.id, { role: e.target.value })}
                placeholder="Role"
                className={inputClass}
              />
              <input
                type="text"
                value={item.phone || ''}
                onChange={(e) => contacts.update(item.id, { phone: e.target.value })}
                placeholder="Phone"
                className={inputClass}
              />
              <input
                type="text"
                value={item.email || ''}
                onChange={(e) => contacts.update(item.id, { email: e.target.value })}
                placeholder="Email"
                className={inputClass}
              />
              <textarea
                rows={1}
                value={item.notes || ''}
                onChange={(e) => contacts.update(item.id, { notes: e.target.value })}
                placeholder="Notes"
                className={`${textareaClass} sm:col-span-4`}
              />
            </div>
          )}
        />

        {/* 4. Operational Notes */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Operational Notes</div>
          <textarea
            rows={4}
            value={summary.operationalNotes || ''}
            onChange={(e) => setSummary((prev) => ({ ...prev, operationalNotes: e.target.value }))}
            placeholder="Internal operational notes for the team executing this event."
            className={textareaClass}
          />
        </div>

        {/* 5. Risks & Special Instructions */}
        <ListSection
          title="Risks & Special Instructions"
          helperText="Anything the operations team must be aware of or handle with care."
          addLabel="Add Risk / Instruction"
          emptyLabel="No Risks or Special Instructions yet."
          items={risks.items}
          loading={loading}
          onAdd={risks.add}
          onDelete={risks.remove}
          onMove={risks.move}
          renderRow={(item) => (
            <textarea
              rows={2}
              value={item.statement}
              onChange={(e) => risks.update(item.id, { statement: e.target.value })}
              placeholder="e.g. Client has a shellfish allergy in the family — kitchen must avoid cross-contamination."
              className={textareaClass}
            />
          )}
        />

        {/* 6. Planning Checklist */}
        <ListSection
          title="Planning Checklist"
          helperText="Track operational readiness items."
          addLabel="Add Checklist Item"
          emptyLabel="No Checklist items yet."
          items={checklist.items}
          loading={loading}
          onAdd={checklist.add}
          onDelete={checklist.remove}
          onMove={checklist.move}
          renderRow={(item) => (
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={item.isComplete}
                onChange={(e) => checklist.update(item.id, { isComplete: e.target.checked })}
                className="w-3.5 h-3.5 cursor-pointer accent-primary shrink-0"
              />
              <input
                type="text"
                value={item.itemText}
                onChange={(e) => checklist.update(item.id, { itemText: e.target.value })}
                placeholder="Checklist item"
                className={`${inputClass} ${item.isComplete ? 'line-through text-muted-foreground' : ''}`}
              />
            </div>
          )}
        />

        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
      </div>

      {/* Workspace Action Bar */}
      <div className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-sm">
          {savedAt ? <span className="font-semibold text-emerald-600">Saved at {savedAt}.</span> : 'Internal only — no workflow, no approvals, no publish.'}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:opacity-90 transition"
        >
          {saving ? 'Saving...' : 'Save Planning'}
        </button>
      </div>
    </div>
  );
}
