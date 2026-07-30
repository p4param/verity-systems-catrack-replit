'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardList, Plus, Trash2 } from 'lucide-react';

import { ProposalWorkspaceStatus, QuotationDetail } from '@/modules/cat/quotation/domain/quotation-types';
import { ProposalAssumption, ProposalExclusion } from '@/modules/cat/quotation/domain/assumption-exclusion-types';
import { ProposalDiscoveryContext } from '@/modules/cat/quotation/components/ProposalDiscoveryContext';
import { WorkspaceStatusBadge } from '@/modules/cat/quotation/components/WorkspaceStatusBadge';

interface AssumptionsExclusionsWorkspaceProps {
  quotation: QuotationDetail;
  onSaved: (status: ProposalWorkspaceStatus) => void;
}

interface EditableStatement {
  id: string;
  statement: string;
}

function toEditable(item: ProposalAssumption | ProposalExclusion): EditableStatement {
  return { id: item.id, statement: item.statement };
}

// A single managed list section (Assumptions or Exclusions). Local to this
// workspace only — not a shared/generic list component — since both
// sections need identical add/edit/delete/reorder behavior within the same
// screen (Collection Authoring Pattern from QM-WP02B-01, applied to a
// single-field item).
function StatementListSection({
  title,
  helperText,
  addLabel,
  emptyLabel,
  placeholder,
  items,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  onMove,
}: {
  title: string;
  helperText: string;
  addLabel: string;
  emptyLabel: string;
  placeholder: string;
  items: EditableStatement[];
  loading: boolean;
  onAdd: () => void;
  onUpdate: (id: string, value: string) => void;
  onDelete: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{helperText}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{addLabel}</span>
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground animate-pulse">Loading...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-8 space-y-2 bg-muted/10 border border-dashed border-border/40 rounded-xl">
          <p className="text-xs text-muted-foreground">{emptyLabel}</p>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{addLabel}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="bg-card border border-border/50 rounded-xl shadow-xs p-2 flex items-start gap-2.5">
              <textarea
                rows={2}
                value={item.statement}
                onChange={(e) => onUpdate(item.id, e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1.5 text-xs text-foreground leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0}
                  title="Move up"
                  className="p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(index, 1)}
                  disabled={index === items.length - 1}
                  title="Move down"
                  className="p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  title="Delete"
                  className="mt-0.5 p-1 rounded text-muted-foreground/50 hover:text-rose-600 hover:bg-rose-500/10 focus-visible:text-rose-600 focus-visible:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500/40 cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onAdd}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-primary py-2.5 rounded-xl border border-dashed border-primary/30 hover:bg-primary/5 cursor-pointer transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{addLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// QM-WP02B-04 — Assumptions & Exclusions Workspace. Two independent managed
// lists (ProposalAssumption, ProposalExclusion) — dedicated business
// entities, not a generic list-item abstraction — sharing one workspace
// status. Save Draft persists both lists in a single explicit call.
export function AssumptionsExclusionsWorkspace({ quotation, onSaved }: AssumptionsExclusionsWorkspaceProps) {
  const [status, setStatus] = useState<ProposalWorkspaceStatus>(quotation.assumptionsExclusionsStatus || 'NOT_STARTED');
  const [assumptions, setAssumptions] = useState<EditableStatement[]>([]);
  const [exclusions, setExclusions] = useState<EditableStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/quotations/${quotation.id}/assumptions-exclusions`);
        const data = await res.json();
        if (data.success) {
          setStatus(data.assumptionsExclusionsStatus || 'NOT_STARTED');
          setAssumptions((data.assumptions || []).map(toEditable));
          setExclusions((data.exclusions || []).map(toEditable));
        }
      } catch (err) {
        console.error('Failed to load Assumptions & Exclusions Workspace:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quotation.id]);

  const addTo = (setter: React.Dispatch<React.SetStateAction<EditableStatement[]>>) => () => {
    setter((prev) => [...prev, { id: crypto.randomUUID(), statement: '' }]);
  };

  const updateIn = (setter: React.Dispatch<React.SetStateAction<EditableStatement[]>>) => (id: string, value: string) => {
    setter((prev) => prev.map((item) => (item.id === id ? { ...item, statement: value } : item)));
  };

  const deleteFrom = (setter: React.Dispatch<React.SetStateAction<EditableStatement[]>>) => (id: string) => {
    setter((prev) => prev.filter((item) => item.id !== id));
  };

  const moveIn = (setter: React.Dispatch<React.SetStateAction<EditableStatement[]>>) => (index: number, direction: -1 | 1) => {
    setter((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/assumptions-exclusions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE',
          assumptions: assumptions.map((a) => ({ id: a.id, statement: a.statement })),
          exclusions: exclusions.map((e) => ({ id: e.id, statement: e.statement })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.assumptionsExclusionsStatus || 'NOT_STARTED');
        setAssumptions((data.assumptions || []).map(toEditable));
        setExclusions((data.exclusions || []).map(toEditable));
        onSaved(data.assumptionsExclusionsStatus || 'NOT_STARTED');
      } else {
        setError(data.error || 'Failed to save Assumptions & Exclusions.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Assumptions & Exclusions.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReady = async () => {
    setMarkingReady(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/assumptions-exclusions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READY' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.assumptionsExclusionsStatus || 'NOT_STARTED');
        onSaved(data.assumptionsExclusionsStatus || 'NOT_STARTED');
      } else {
        setError(data.error || 'Failed to mark Assumptions & Exclusions Ready.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to mark Assumptions & Exclusions Ready.');
    } finally {
      setMarkingReady(false);
    }
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">Assumptions & Exclusions</h3>
        </div>
        <WorkspaceStatusBadge status={status} />
      </div>

      <div className="p-5 space-y-8">
        <ProposalDiscoveryContext quotation={quotation} />

        <StatementListSection
          title="Assumptions"
          helperText="Highlight the conditions on which this proposal is based."
          addLabel="Add Assumption"
          emptyLabel="No Assumptions yet."
          placeholder="e.g. Final guest count will be confirmed 14 days prior to the event."
          items={assumptions}
          loading={loading}
          onAdd={addTo(setAssumptions)}
          onUpdate={updateIn(setAssumptions)}
          onDelete={deleteFrom(setAssumptions)}
          onMove={moveIn(setAssumptions)}
        />

        <StatementListSection
          title="Exclusions"
          helperText="Clearly identify what is not included in this proposal."
          addLabel="Add Exclusion"
          emptyLabel="No Exclusions yet."
          placeholder="e.g. Transportation to and from the venue is not included."
          items={exclusions}
          loading={loading}
          onAdd={addTo(setExclusions)}
          onUpdate={updateIn(setExclusions)}
          onDelete={deleteFrom(setExclusions)}
          onMove={moveIn(setExclusions)}
        />

        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
      </div>

      {/* Workspace Action Bar */}
      <div className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-sm">
          <span className="font-semibold text-foreground">Save Draft</span> keeps your Assumptions & Exclusions.{' '}
          <span className="font-semibold text-foreground">Mark Ready</span> flags this workspace as complete once the draft is saved.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-muted/60 text-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={handleMarkReady}
            disabled={markingReady || status === 'READY'}
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition"
          >
            {markingReady ? 'Marking Ready...' : status === 'READY' ? '✓ Ready' : 'Mark Ready'}
          </button>
        </div>
      </div>
    </div>
  );
}
