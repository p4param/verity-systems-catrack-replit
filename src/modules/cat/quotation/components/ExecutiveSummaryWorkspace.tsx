'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

import { QuotationDetail, QuotationExecutiveSummary } from '@/modules/cat/quotation/domain/quotation-types';
import { ProposalDiscoveryContext } from '@/modules/cat/quotation/components/ProposalDiscoveryContext';
import { WorkspaceStatusBadge } from '@/modules/cat/quotation/components/WorkspaceStatusBadge';

interface ExecutiveSummaryWorkspaceProps {
  quotation: QuotationDetail;
  onSaved: (patch: QuotationExecutiveSummary) => void;
}

// QM-WP02A — Executive Summary Workspace. The first and only fully
// implemented Proposal Workspace. Discovery Context is read-only and
// inherited from the Inquiry — Discovery remains the source of truth and is
// never duplicated here.
export function ExecutiveSummaryWorkspace({ quotation, onSaved }: ExecutiveSummaryWorkspaceProps) {
  const [proposalObjective, setProposalObjective] = useState(quotation.proposalObjective || '');
  const [executiveNotes, setExecutiveNotes] = useState(quotation.executiveNotes || '');
  const [saving, setSaving] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setProposalObjective(quotation.proposalObjective || '');
    setExecutiveNotes(quotation.executiveNotes || '');
  }, [quotation.id]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/executive-summary`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SAVE', proposalObjective, executiveNotes }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved(data.executiveSummary);
      } else {
        setError(data.error || 'Failed to save Executive Summary.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Executive Summary.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReady = async () => {
    setMarkingReady(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/executive-summary`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READY' }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved(data.executiveSummary);
      } else {
        setError(data.error || 'Failed to mark Executive Summary Ready.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to mark Executive Summary Ready.');
    } finally {
      setMarkingReady(false);
    }
  };

  const status = quotation.executiveSummaryStatus || 'NOT_STARTED';

  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">Executive Summary</h3>
        </div>
        <WorkspaceStatusBadge status={status} />
      </div>

      <div className="p-5 space-y-8">
        <ProposalDiscoveryContext quotation={quotation} />

        {/* Proposal Information — editable */}
        <div className="space-y-6">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Proposal Information</div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-foreground">Proposal Objective</label>
            <p className="text-[11px] text-muted-foreground">Short executive description of the commercial objective.</p>
            <textarea
              rows={4}
              value={proposalObjective}
              onChange={(e) => setProposalObjective(e.target.value)}
              placeholder="e.g. Deliver a premium anniversary celebration emphasizing elegant hospitality and exceptional dining."
              className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-xs text-foreground leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-foreground">Executive Notes</label>
            <p className="text-[11px] text-muted-foreground">Internal proposal notes visible only inside the Proposal Builder.</p>
            <textarea
              rows={4}
              value={executiveNotes}
              onChange={(e) => setExecutiveNotes(e.target.value)}
              placeholder="e.g. Customer values presentation over menu variety. Emphasize hospitality during final proposal."
              className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-xs text-foreground leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
      </div>

      {/* Workspace Action Bar */}
      <div className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-sm">
          <span className="font-semibold text-foreground">Save Draft</span> keeps your edits.{' '}
          <span className="font-semibold text-foreground">Mark Ready</span> flags this workspace as complete once the draft is saved.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
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
