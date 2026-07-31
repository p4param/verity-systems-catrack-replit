'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Gavel, History } from 'lucide-react';

import { QuotationDetail } from '@/modules/cat/quotation/domain/quotation-types';
import { PublicationDetail, PublishedRevisionSummary } from '@/modules/cat/quotation/domain/revision-management-types';
import { ProposalDelivery } from '@/modules/cat/quotation/domain/proposal-delivery-types';
import {
  CUSTOMER_DECISION_LABELS,
  CustomerDecisionRecord,
  CustomerDecisionType,
} from '@/modules/cat/quotation/domain/customer-decision-types';
import { SnapshotViewerDialog } from '@/modules/cat/quotation/components/SnapshotViewerDialog';
import { CurrentPublishedRevisionPanel } from '@/modules/cat/quotation/components/CurrentPublishedRevisionPanel';
import { DeliveryHistoryList } from '@/modules/cat/quotation/components/DeliveryHistoryList';

interface CustomerDecisionWorkspaceProps {
  quotation: QuotationDetail;
}

const DECISION_BADGE_CLASS: Record<CustomerDecisionType, string> = {
  PENDING_RESPONSE: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ACCEPTED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  ACCEPTED_WITH_CONDITIONS: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  REVISION_REQUESTED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  EXPIRED: 'bg-muted text-muted-foreground border-border/40',
  WITHDRAWN: 'bg-muted text-muted-foreground border-border/40',
};

const DECISION_ORDER: CustomerDecisionType[] = [
  'PENDING_RESPONSE',
  'ACCEPTED',
  'ACCEPTED_WITH_CONDITIONS',
  'REVISION_REQUESTED',
  'REJECTED',
  'EXPIRED',
  'WITHDRAWN',
];

// QM-WP04D — Customer Decision Workspace.
// Records what the customer decided about the Current Published Revision
// — never a working draft, enforced server-side. Out of scope, per the
// Engineering Package: Event Conversion, Contracts, e-signatures, a
// customer portal — this is purely an internal record-keeping tool.
// Reuses SnapshotViewerDialog, CurrentPublishedRevisionPanel, and
// DeliveryHistoryList rather than duplicating any of them.
export function CustomerDecisionWorkspace({ quotation }: CustomerDecisionWorkspaceProps) {
  const [latestPublished, setLatestPublished] = useState<PublishedRevisionSummary | null | undefined>(undefined);
  const [deliveries, setDeliveries] = useState<ProposalDelivery[] | null>(null);
  const [decisions, setDecisions] = useState<CustomerDecisionRecord[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedDecision, setSelectedDecision] = useState<CustomerDecisionType>('PENDING_RESPONSE');
  const [notes, setNotes] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState('');
  const [recordSuccess, setRecordSuccess] = useState('');

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewPublication, setViewPublication] = useState<PublicationDetail | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [revRes, deliveriesRes, decisionsRes] = await Promise.all([
          fetch(`/api/cat/quotations/${quotation.id}/revisions`).then((r) => r.json()),
          fetch(`/api/cat/quotations/${quotation.id}/deliveries`).then((r) => r.json()),
          fetch(`/api/cat/quotations/${quotation.id}/decisions`).then((r) => r.json()),
        ]);
        if (revRes.success) {
          const revisions: PublishedRevisionSummary[] = revRes.publishedRevisions || [];
          setLatestPublished(revisions.length > 0 ? revisions[0] : null);
        }
        if (deliveriesRes.success) setDeliveries(deliveriesRes.deliveries);
        if (decisionsRes.success) {
          setDecisions(decisionsRes.decisions);
          // UX Polish — the segmented selector must open on the current
          // decision (the most recent record), not always default to
          // Pending Response.
          const decisions: CustomerDecisionRecord[] = decisionsRes.decisions || [];
          setSelectedDecision(decisions.length > 0 ? decisions[0].decision : 'PENDING_RESPONSE');
        }
      } catch (err) {
        console.error('Failed to load Customer Decision Workspace:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quotation.id]);

  const refreshDecisions = async () => {
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/decisions`);
      const data = await res.json();
      if (data.success) setDecisions(data.decisions);
    } catch (err) {
      console.error('Failed to refresh Decision History:', err);
    }
  };

  // Delivery Summary — deliveries for the Current Published Revision only,
  // not the whole quotation's delivery history.
  const deliverySummary = useMemo(() => {
    if (!deliveries || !latestPublished) return deliveries;
    return deliveries.filter((d) => d.revisionNumber === latestPublished.revisionNumber);
  }, [deliveries, latestPublished]);

  const currentDecision = decisions && decisions.length > 0 ? decisions[0] : null;
  const currentDecisionType: CustomerDecisionType = currentDecision?.decision ?? 'PENDING_RESPONSE';

  // UX Polish — nothing to record if the selector still matches the
  // current decision and no notes have been entered. Re-selecting the same
  // decision, or clearing notes back to empty, disables the button again.
  const hasUnsavedChange = selectedDecision !== currentDecisionType || notes.trim() !== '';

  const fetchPublication = async (revisionNumber: number): Promise<PublicationDetail | null> => {
    const res = await fetch(`/api/cat/quotations/${quotation.id}/publications/${revisionNumber}`);
    const data = await res.json();
    return data.success ? data.publication : null;
  };

  const handleViewSnapshot = async () => {
    if (!latestPublished) return;
    setViewOpen(true);
    setViewLoading(true);
    setViewPublication(null);
    try {
      setViewPublication(await fetchPublication(latestPublished.revisionNumber));
    } finally {
      setViewLoading(false);
    }
  };

  const handleRecordDecision = async () => {
    setRecording(true);
    setRecordError('');
    setRecordSuccess('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: selectedDecision, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setRecordSuccess(`Recorded: ${CUSTOMER_DECISION_LABELS[selectedDecision]}.`);
        setNotes('');
        await refreshDecisions();
      } else {
        setRecordError(data.error || 'Failed to record decision.');
      }
    } catch (err: any) {
      setRecordError(err.message || 'Failed to record decision.');
    } finally {
      setRecording(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Customer Decision...</div>;
  }

  return (
    <div className="space-y-4">
      <CurrentPublishedRevisionPanel
        latestPublished={latestPublished ?? null}
        onViewSnapshot={handleViewSnapshot}
        emptyMessage="No published revision yet. Publish this proposal first (Proposal Review → Publish Proposal) before a customer decision can be recorded."
      />

      {latestPublished && (
        <>
          <DeliveryHistoryList
            title="Delivery Summary"
            deliveries={deliverySummary}
            emptyMessage="Revision has not been delivered to the customer yet."
          />

          {/* Customer Decision + Decision Notes */}
          <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Gavel className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-extrabold text-foreground">Customer Decision</h3>
              </div>
              {currentDecision && (
                <span
                  className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border ${DECISION_BADGE_CLASS[currentDecision.decision]}`}
                >
                  Current: {CUSTOMER_DECISION_LABELS[currentDecision.decision]}
                </span>
              )}
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">Decision</label>
                <div className="flex flex-wrap gap-2">
                  {DECISION_ORDER.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDecision(d)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${
                        selectedDecision === d
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {CUSTOMER_DECISION_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Decision Notes <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record what the customer said, any conditions, or context for this decision..."
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-xs text-foreground leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              {recordError && <p className="text-xs text-rose-600 font-semibold">{recordError}</p>}
              {recordSuccess && <p className="text-xs text-emerald-600 font-semibold">{recordSuccess}</p>}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRecordDecision}
                  disabled={recording || !hasUnsavedChange}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
                >
                  <Gavel className="w-3.5 h-3.5" />
                  {recording ? 'Recording...' : 'Record Decision'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Decision History */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border/40 flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">Decision History</h3>
        </div>
        <div className="p-5">
          {!decisions || decisions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No decisions recorded yet.</p>
          ) : (
            <div className="divide-y divide-border/30 border border-border/30 rounded-xl overflow-hidden">
              {decisions.map((d) => (
                <div key={d.id} className="flex items-start justify-between gap-3 px-4 py-3 bg-card">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${DECISION_BADGE_CLASS[d.decision]}`}
                      >
                        {CUSTOMER_DECISION_LABELS[d.decision]}
                      </span>
                      <span className="text-xs font-extrabold text-foreground">Revision {d.revisionNumber}</span>
                    </div>
                    {d.notes && <div className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap">{d.notes}</div>}
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground shrink-0">
                    <div>{new Date(d.recordedAt).toLocaleString()}</div>
                    {d.recordedBy && <div>by {d.recordedBy.fullName}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SnapshotViewerDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        publication={viewPublication}
        loading={viewLoading}
        quotationTitle={quotation.title}
        quotationNumber={quotation.quotationNumber}
      />
    </div>
  );
}
