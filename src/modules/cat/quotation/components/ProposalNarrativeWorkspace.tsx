'use client';

import React, { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';

import { ProposalWorkspaceStatus, QuotationDetail } from '@/modules/cat/quotation/domain/quotation-types';
import { ProposalDiscoveryContext } from '@/modules/cat/quotation/components/ProposalDiscoveryContext';
import { WorkspaceStatusBadge } from '@/modules/cat/quotation/components/WorkspaceStatusBadge';

interface ProposalNarrativeWorkspaceProps {
  quotation: QuotationDetail;
  onSaved: (status: ProposalWorkspaceStatus) => void;
}

// QM-WP02B-02 — Proposal Narrative Workspace. A document-oriented workspace
// with a single required narrative document + optional internal author
// notes, stored directly on the Quotation entity. No generic document
// engine, no templates, no merge fields, no PDF output.
export function ProposalNarrativeWorkspace({ quotation, onSaved }: ProposalNarrativeWorkspaceProps) {
  const [status, setStatus] = useState<ProposalWorkspaceStatus>(quotation.proposalNarrativeStatus || 'NOT_STARTED');
  const [proposalNarrative, setProposalNarrative] = useState('');
  const [internalAuthorNotes, setInternalAuthorNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/quotations/${quotation.id}/proposal-narrative`);
        const data = await res.json();
        if (data.success) {
          setStatus(data.proposalNarrativeStatus || 'NOT_STARTED');
          setProposalNarrative(data.proposalNarrative || '');
          setInternalAuthorNotes(data.internalAuthorNotes || '');
        }
      } catch (err) {
        console.error('Failed to load Proposal Narrative Workspace:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quotation.id]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/proposal-narrative`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SAVE', proposalNarrative, internalAuthorNotes }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.proposalNarrativeStatus || 'NOT_STARTED');
        setProposalNarrative(data.proposalNarrative || '');
        setInternalAuthorNotes(data.internalAuthorNotes || '');
        onSaved(data.proposalNarrativeStatus || 'NOT_STARTED');
      } else {
        setError(data.error || 'Failed to save Proposal Narrative.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Proposal Narrative.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReady = async () => {
    setMarkingReady(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/proposal-narrative`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READY' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.proposalNarrativeStatus || 'NOT_STARTED');
        onSaved(data.proposalNarrativeStatus || 'NOT_STARTED');
      } else {
        setError(data.error || 'Failed to mark Proposal Narrative Ready.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to mark Proposal Narrative Ready.');
    } finally {
      setMarkingReady(false);
    }
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">Proposal Narrative</h3>
        </div>
        <WorkspaceStatusBadge status={status} />
      </div>

      <div className="p-5 space-y-8">
        <ProposalDiscoveryContext quotation={quotation} />

        <div className="space-y-6">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Narrative Document</div>

          {loading ? (
            <p className="text-xs text-muted-foreground animate-pulse">Loading Proposal Narrative...</p>
          ) : (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground">Narrative *</label>
                <p className="text-[11px] text-muted-foreground">
                  The descriptive narrative that brings this proposal to life for the customer.
                </p>
                <textarea
                  rows={12}
                  value={proposalNarrative}
                  onChange={(e) => setProposalNarrative(e.target.value)}
                  placeholder="Describe the event, the customer's vision, and how this proposal fulfills it..."
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-3 text-sm text-foreground leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground">Internal Author Notes</label>
                <p className="text-[11px] text-muted-foreground">
                  Internal drafting notes. These notes are never included in the customer proposal.
                </p>
                <textarea
                  rows={4}
                  value={internalAuthorNotes}
                  onChange={(e) => setInternalAuthorNotes(e.target.value)}
                  placeholder="e.g. drafting reminders or context for the next editor — never shown to the customer..."
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-xs text-foreground leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </>
          )}
        </div>

        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
      </div>

      {/* Workspace Action Bar */}
      <div className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-sm">
          <span className="font-semibold text-foreground">Save Draft</span> keeps your narrative.{' '}
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
