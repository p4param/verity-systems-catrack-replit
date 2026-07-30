'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ListChecks, Plus, Trash2 } from 'lucide-react';

import { ProposalWorkspaceStatus, QuotationDetail } from '@/modules/cat/quotation/domain/quotation-types';
import { ScopeServiceBlock } from '@/modules/cat/quotation/domain/scope-service-block-types';
import { ProposalDiscoveryContext } from '@/modules/cat/quotation/components/ProposalDiscoveryContext';
import { WorkspaceStatusBadge } from '@/modules/cat/quotation/components/WorkspaceStatusBadge';

interface ScopeOfServicesWorkspaceProps {
  quotation: QuotationDetail;
  onSaved: (status: ProposalWorkspaceStatus) => void;
}

interface EditableBlock {
  id: string;
  blockTitle: string;
  customerDescription: string;
  internalNotes: string;
}

function toEditable(block: ScopeServiceBlock): EditableBlock {
  return {
    id: block.id,
    blockTitle: block.blockTitle,
    customerDescription: block.customerDescription,
    internalNotes: block.internalNotes || '',
  };
}

// QM-WP02B-01 — Scope of Services Workspace. Service Blocks are a dedicated
// business entity (ScopeServiceBlock) — a repeatable, reorderable list, not
// a generic proposal-section engine. Add/Edit/Delete/Reorder all happen in
// local state; Save Draft persists the entire current list in one explicit
// call, matching the Executive Summary Save Draft convention.
export function ScopeOfServicesWorkspace({ quotation, onSaved }: ScopeOfServicesWorkspaceProps) {
  const [status, setStatus] = useState<ProposalWorkspaceStatus>(quotation.scopeOfServicesStatus || 'NOT_STARTED');
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/quotations/${quotation.id}/scope-of-services`);
        const data = await res.json();
        if (data.success) {
          setStatus(data.scopeOfServicesStatus || 'NOT_STARTED');
          setBlocks((data.blocks || []).map(toEditable));
        }
      } catch (err) {
        console.error('Failed to load Scope of Services Workspace:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quotation.id]);

  const handleAddBlock = () => {
    setBlocks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), blockTitle: '', customerDescription: '', internalNotes: '' },
    ]);
  };

  const handleUpdateBlock = (id: string, field: keyof Omit<EditableBlock, 'id'>, value: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const handleDeleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleMoveBlock = (index: number, direction: -1 | 1) => {
    setBlocks((prev) => {
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
      const res = await fetch(`/api/cat/quotations/${quotation.id}/scope-of-services`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE',
          blocks: blocks.map((b) => ({
            id: b.id,
            blockTitle: b.blockTitle,
            customerDescription: b.customerDescription,
            internalNotes: b.internalNotes,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.scopeOfServicesStatus || 'NOT_STARTED');
        setBlocks((data.blocks || []).map(toEditable));
        onSaved(data.scopeOfServicesStatus || 'NOT_STARTED');
      } else {
        setError(data.error || 'Failed to save Scope of Services.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Scope of Services.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReady = async () => {
    setMarkingReady(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/scope-of-services`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READY' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.scopeOfServicesStatus || 'NOT_STARTED');
        onSaved(data.scopeOfServicesStatus || 'NOT_STARTED');
      } else {
        setError(data.error || 'Failed to mark Scope of Services Ready.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to mark Scope of Services Ready.');
    } finally {
      setMarkingReady(false);
    }
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">Scope of Services</h3>
        </div>
        <WorkspaceStatusBadge status={status} />
      </div>

      <div className="p-5 space-y-8">
        <ProposalDiscoveryContext quotation={quotation} />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Service Blocks</div>
            <button
              type="button"
              onClick={handleAddBlock}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service Block</span>
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground animate-pulse">Loading Service Blocks...</p>
          ) : blocks.length === 0 ? (
            <div className="text-center py-8 space-y-2 bg-muted/10 border border-dashed border-border/40 rounded-xl">
              <p className="text-xs text-muted-foreground">No Service Blocks yet.</p>
              <button
                type="button"
                onClick={handleAddBlock}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add the first Service Block</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {blocks.map((block, index) => (
                <div key={block.id} className="bg-card border border-border/50 rounded-2xl shadow-xs p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                        Block {index + 1}
                      </span>
                      <h4 className="text-sm font-extrabold text-foreground truncate">
                        {block.blockTitle.trim() || 'New Service Block'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveBlock(index, -1)}
                          disabled={index === 0}
                          title="Move up"
                          className="p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveBlock(index, 1)}
                          disabled={index === blocks.length - 1}
                          title="Move down"
                          className="p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(block.id)}
                        title="Delete Service Block"
                        className="p-1.5 rounded-md text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 cursor-pointer transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">Block Title *</label>
                    <input
                      type="text"
                      value={block.blockTitle}
                      onChange={(e) => handleUpdateBlock(block.id, 'blockTitle', e.target.value)}
                      placeholder="e.g. Venue Styling & Decor"
                      className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">Proposal Description *</label>
                    <textarea
                      rows={3}
                      value={block.customerDescription}
                      onChange={(e) => handleUpdateBlock(block.id, 'customerDescription', e.target.value)}
                      placeholder="Describe this service the way the customer will read it in the proposal."
                      className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-xs text-foreground leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">Internal Notes</label>
                    <textarea
                      rows={2}
                      value={block.internalNotes}
                      onChange={(e) => handleUpdateBlock(block.id, 'internalNotes', e.target.value)}
                      placeholder="Optional — visible only inside the Proposal Builder."
                      className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-xs text-foreground leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddBlock}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-primary py-3 rounded-xl border border-dashed border-primary/30 hover:bg-primary/5 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Service Block</span>
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
      </div>

      {/* Workspace Action Bar */}
      <div className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-sm">
          <span className="font-semibold text-foreground">Save Draft</span> keeps your Service Blocks.{' '}
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
