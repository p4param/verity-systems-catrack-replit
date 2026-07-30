'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Star, Trash2 } from 'lucide-react';

import { ProposalWorkspaceStatus, QuotationDetail } from '@/modules/cat/quotation/domain/quotation-types';
import { ProposalHighlight } from '@/modules/cat/quotation/domain/proposal-highlight-types';
import { ProposalDiscoveryContext } from '@/modules/cat/quotation/components/ProposalDiscoveryContext';
import { WorkspaceStatusBadge } from '@/modules/cat/quotation/components/WorkspaceStatusBadge';

interface ProposalHighlightsWorkspaceProps {
  quotation: QuotationDetail;
  onSaved: (status: ProposalWorkspaceStatus) => void;
}

interface EditableHighlight {
  id: string;
  highlightTitle: string;
  highlightDescription: string;
  internalNotes: string;
}

function toEditable(highlight: ProposalHighlight): EditableHighlight {
  return {
    id: highlight.id,
    highlightTitle: highlight.highlightTitle,
    highlightDescription: highlight.highlightDescription,
    internalNotes: highlight.internalNotes || '',
  };
}

// QM-WP02B-03 — Proposal Highlights Workspace. Highlight Cards are a
// dedicated business entity (ProposalHighlight) — a repeatable, reorderable
// list following the Collection Authoring Pattern established by Scope of
// Services (QM-WP02B-01), not a generic proposal engine. Add/Edit/Delete/
// Reorder all happen in local state; Save Draft persists the entire current
// list in one explicit call.
export function ProposalHighlightsWorkspace({ quotation, onSaved }: ProposalHighlightsWorkspaceProps) {
  const [status, setStatus] = useState<ProposalWorkspaceStatus>(quotation.proposalHighlightsStatus || 'NOT_STARTED');
  const [highlights, setHighlights] = useState<EditableHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/quotations/${quotation.id}/proposal-highlights`);
        const data = await res.json();
        if (data.success) {
          setStatus(data.proposalHighlightsStatus || 'NOT_STARTED');
          setHighlights((data.highlights || []).map(toEditable));
        }
      } catch (err) {
        console.error('Failed to load Proposal Highlights Workspace:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quotation.id]);

  const handleAddHighlight = () => {
    setHighlights((prev) => [
      ...prev,
      { id: crypto.randomUUID(), highlightTitle: '', highlightDescription: '', internalNotes: '' },
    ]);
  };

  const handleUpdateHighlight = (id: string, field: keyof Omit<EditableHighlight, 'id'>, value: string) => {
    setHighlights((prev) => prev.map((h) => (h.id === id ? { ...h, [field]: value } : h)));
  };

  const handleDeleteHighlight = (id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  const handleMoveHighlight = (index: number, direction: -1 | 1) => {
    setHighlights((prev) => {
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
      const res = await fetch(`/api/cat/quotations/${quotation.id}/proposal-highlights`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE',
          highlights: highlights.map((h) => ({
            id: h.id,
            highlightTitle: h.highlightTitle,
            highlightDescription: h.highlightDescription,
            internalNotes: h.internalNotes,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.proposalHighlightsStatus || 'NOT_STARTED');
        setHighlights((data.highlights || []).map(toEditable));
        onSaved(data.proposalHighlightsStatus || 'NOT_STARTED');
      } else {
        setError(data.error || 'Failed to save Proposal Highlights.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Proposal Highlights.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReady = async () => {
    setMarkingReady(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/proposal-highlights`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READY' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.proposalHighlightsStatus || 'NOT_STARTED');
        onSaved(data.proposalHighlightsStatus || 'NOT_STARTED');
      } else {
        setError(data.error || 'Failed to mark Proposal Highlights Ready.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to mark Proposal Highlights Ready.');
    } finally {
      setMarkingReady(false);
    }
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">Proposal Highlights</h3>
        </div>
        <WorkspaceStatusBadge status={status} />
      </div>

      <div className="p-5 space-y-8">
        <ProposalDiscoveryContext quotation={quotation} />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Highlights</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Highlight the key reasons your customer should choose this proposal.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddHighlight}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Highlight</span>
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground animate-pulse">Loading Highlights...</p>
          ) : highlights.length === 0 ? (
            <div className="text-center py-8 space-y-2 bg-muted/10 border border-dashed border-border/40 rounded-xl">
              <p className="text-xs text-muted-foreground">No Highlights yet.</p>
              <button
                type="button"
                onClick={handleAddHighlight}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Highlight</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {highlights.map((highlight, index) => (
                <div key={highlight.id} className="bg-card border border-border/50 rounded-2xl shadow-xs p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-foreground truncate">
                        {highlight.highlightTitle.trim() || 'New Highlight'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveHighlight(index, -1)}
                          disabled={index === 0}
                          title="Move up"
                          className="p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveHighlight(index, 1)}
                          disabled={index === highlights.length - 1}
                          title="Move down"
                          className="p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteHighlight(highlight.id)}
                        title="Delete Highlight"
                        className="p-1.5 rounded-md text-muted-foreground/50 hover:text-rose-600 hover:bg-rose-500/10 focus-visible:text-rose-600 focus-visible:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500/40 cursor-pointer transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">Highlight Title *</label>
                    <input
                      type="text"
                      value={highlight.highlightTitle}
                      onChange={(e) => handleUpdateHighlight(highlight.id, 'highlightTitle', e.target.value)}
                      placeholder="e.g. Premium Hospitality"
                      className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">Highlight Description *</label>
                    <textarea
                      rows={3}
                      value={highlight.highlightDescription}
                      onChange={(e) => handleUpdateHighlight(highlight.id, 'highlightDescription', e.target.value)}
                      placeholder="Describe why this aspect of your proposal creates value for the customer..."
                      className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-xs text-foreground leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">Internal Notes</label>
                    <p className="text-[11px] text-muted-foreground">
                      Internal drafting notes. These notes are never included in the customer proposal.
                    </p>
                    <textarea
                      rows={2}
                      value={highlight.internalNotes}
                      onChange={(e) => handleUpdateHighlight(highlight.id, 'internalNotes', e.target.value)}
                      placeholder="Optional — not shown to the customer."
                      className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-xs text-foreground leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddHighlight}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-primary py-3 rounded-xl border border-dashed border-primary/30 hover:bg-primary/5 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Highlight</span>
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
      </div>

      {/* Workspace Action Bar */}
      <div className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-sm">
          <span className="font-semibold text-foreground">Save Draft</span> keeps your Highlights.{' '}
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
