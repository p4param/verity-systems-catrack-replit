'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronRight, ClipboardCheck, CheckCircle2, History, Send } from 'lucide-react';

import { QuotationDetail } from '@/modules/cat/quotation/domain/quotation-types';
import {
  PROPOSAL_HEALTH_WORKSPACE_KEYS,
  PROPOSAL_WORKSPACE_LABELS,
  ProposalWorkspaceKey,
} from '@/modules/cat/quotation/domain/proposal-workspace-types';
import { ProposalReviewData } from '@/modules/cat/quotation/domain/proposal-review-types';
import { formatCurrency } from '@/modules/cat/quotation/domain/proposal-pricing-types';
import { PAYMENT_METHOD_LABELS, CommercialPaymentMethod } from '@/modules/cat/quotation/domain/commercial-terms-types';
import { ProposalDiscoveryContext } from '@/modules/cat/quotation/components/ProposalDiscoveryContext';
import { WorkspaceStatusBadge } from '@/modules/cat/quotation/components/WorkspaceStatusBadge';
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

interface ProposalReviewWorkspaceProps {
  quotation: QuotationDetail;
  onEditWorkspace: (key: ProposalWorkspaceKey) => void;
  onPublished: (revisionNumber: number) => void;
}

interface PublicationResult {
  revisionNumber: number;
  publishedAt: string;
}

// Outstanding items come back from the API as labels only (no payload
// changes for this UX pass) — reverse-map label -> key client-side so each
// outstanding item can still offer direct Edit navigation.
const LABEL_TO_KEY: Record<string, ProposalWorkspaceKey> = PROPOSAL_HEALTH_WORKSPACE_KEYS.reduce(
  (acc, key) => {
    acc[PROPOSAL_WORKSPACE_LABELS[key]] = key;
    return acc;
  },
  {} as Record<string, ProposalWorkspaceKey>,
);

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline cursor-pointer shrink-0"
    >
      <span>Edit</span>
      <ChevronRight className="w-3 h-3" />
    </button>
  );
}

// QM-WP03D — Proposal Review Workspace. Intentionally different from every
// other Proposal Builder workspace: a read-only review dashboard. It owns
// no business data and persists nothing — everything shown here is derived
// from the other workspaces via a single GET call. No Save Draft, no Mark
// Ready, no Workspace Status of its own.
export function ProposalReviewWorkspace({ quotation, onEditWorkspace, onPublished }: ProposalReviewWorkspaceProps) {
  const [data, setData] = useState<ProposalReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  // QM-WP04C UX Polish — Navigation Gap Fix. Whether the "View Revisions"
  // action is shown at all: true only once at least one published revision
  // exists. Reuses the existing GET /revisions endpoint — no new API.
  const [hasPublishedRevisions, setHasPublishedRevisions] = useState(false);

  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishResult, setPublishResult] = useState<PublicationResult | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/quotations/${quotation.id}/proposal-review`);
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load Proposal Review:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quotation.id]);

  useEffect(() => {
    const checkPublishedRevisions = async () => {
      try {
        const res = await fetch(`/api/cat/quotations/${quotation.id}/revisions`);
        const json = await res.json();
        if (json.success) {
          setHasPublishedRevisions((json.publishedRevisions || []).length > 0);
        }
      } catch (err) {
        console.error('Failed to check published revisions:', err);
      }
    };
    checkPublishedRevisions();
  }, [quotation.id]);

  const openPublishDialog = () => {
    setPublishError('');
    setPublishResult(null);
    setShowPublishDialog(true);
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/publish`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setPublishResult({ revisionNumber: json.publication.revisionNumber, publishedAt: json.publication.publishedAt });
        setHasPublishedRevisions(true);
        onPublished(json.publication.revisionNumber);
      } else {
        setPublishError(json.error || 'Failed to publish Proposal.');
      }
    } catch (err: any) {
      setPublishError(err.message || 'Failed to publish Proposal.');
    } finally {
      setPublishing(false);
    }
  };

  const closePublishDialog = () => {
    setShowPublishDialog(false);
    setPublishResult(null);
    setPublishError('');
  };

  const goToRevisions = () => {
    setShowPublishDialog(false);
    onEditWorkspace('REVISIONS');
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">Proposal Review</h3>
        </div>
        {hasPublishedRevisions && (
          <button
            type="button"
            onClick={() => onEditWorkspace('REVISIONS')}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline cursor-pointer shrink-0"
          >
            <History className="w-3.5 h-3.5" />
            View Revisions
          </button>
        )}
      </div>

      <div className="p-5 space-y-8">
        {loading || !data ? (
          <p className="text-xs text-muted-foreground animate-pulse">Loading Proposal Review...</p>
        ) : (
          <>
            {/* Overall Readiness — the page's primary status indicator */}
            {data.overallReady ? (
              <div className="flex items-center justify-between gap-3 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                  <span className="text-lg font-black text-emerald-700 tracking-tight">Ready for Next Stage</span>
                </div>
                <button
                  type="button"
                  onClick={openPublishDialog}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-emerald-700 transition shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Proposal</span>
                </button>
              </div>
            ) : (
              <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-7 h-7 text-amber-600 shrink-0" />
                  <span className="text-lg font-black text-amber-700 tracking-tight">Quotation Incomplete</span>
                </div>
                <div className="pl-10 space-y-1.5">
                  <div className="text-[10px] font-bold text-amber-700/70 uppercase tracking-wider">Outstanding Items</div>
                  <div className="space-y-1">
                    {data.outstandingWorkspaces.map((label) => {
                      const key = LABEL_TO_KEY[label];
                      return (
                        <div
                          key={label}
                          className="flex items-center justify-between gap-3 bg-card/70 border border-amber-500/20 rounded-lg px-3 py-1.5"
                        >
                          <span className="text-xs font-bold text-foreground">{label}</span>
                          {key && <EditButton onClick={() => onEditWorkspace(key)} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <ProposalDiscoveryContext quotation={quotation} collapsible defaultExpanded />

            {/* Proposal Content Summary */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Proposal Content</div>
              <div className="divide-y divide-border/30 border border-border/30 rounded-xl overflow-hidden">
                {data.proposalContent.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-card">
                    <span className="text-xs font-bold text-foreground">{row.label}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <WorkspaceStatusBadge status={row.status} />
                      <EditButton onClick={() => onEditWorkspace(row.key)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commercial Summary */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Commercial Summary</div>

              <div className="border border-border/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-foreground">Commercial Pricing</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <WorkspaceStatusBadge status={data.commercialPricing.status} />
                    <EditButton onClick={() => onEditWorkspace('COMMERCIALS')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Charges Total</div>
                    <div className="font-bold text-foreground">{formatCurrency(data.commercialPricing.chargesTotal)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Discount Total</div>
                    <div className="font-bold text-foreground">{formatCurrency(data.commercialPricing.discountTotal)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Adjustment Total</div>
                    <div className="font-bold text-foreground">{formatCurrency(data.commercialPricing.adjustmentTotal)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-primary/80 uppercase tracking-wide font-bold">Grand Total</div>
                    <div className="text-base font-black text-primary tracking-tight">
                      {formatCurrency(data.commercialPricing.grandTotal)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-border/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-foreground">Commercial Terms</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <WorkspaceStatusBadge status={data.commercialTerms.status} />
                    <EditButton onClick={() => onEditWorkspace('TERMS_CONDITIONS')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Valid Until</div>
                    <div className="font-bold text-foreground">
                      {data.commercialTerms.validUntil ? new Date(data.commercialTerms.validUntil).toLocaleDateString() : 'Not set'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Payment Method</div>
                    <div className="font-bold text-foreground">
                      {data.commercialTerms.paymentMethod
                        ? PAYMENT_METHOD_LABELS[data.commercialTerms.paymentMethod as CommercialPaymentMethod] ||
                          data.commercialTerms.paymentMethod
                        : 'Not set'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Advance Required</div>
                    <div className="font-bold text-foreground">
                      {typeof data.commercialTerms.advanceRequired === 'boolean'
                        ? data.commercialTerms.advanceRequired
                          ? 'Yes'
                          : 'No'
                        : 'Not set'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Currency</div>
                    <div className="font-bold text-foreground">{data.commercialTerms.currencyCode}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <AlertDialog open={showPublishDialog} onOpenChange={(open) => !open && closePublishDialog()}>
        <AlertDialogContent>
          {publishResult ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Proposal Published
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-0.5">
                      <div className="text-sm font-black text-foreground">Revision {publishResult.revisionNumber}</div>
                      <div className="text-xs font-bold text-emerald-600">Published Successfully</div>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Published At:</span>{' '}
                      <span className="font-bold text-foreground">{new Date(publishResult.publishedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={closePublishDialog}>Continue Working</AlertDialogCancel>
                <AlertDialogAction onClick={goToRevisions}>Go to Revisions</AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Publish Proposal?</AlertDialogTitle>
                <AlertDialogDescription>
                  Revision {quotation.currentRevision?.revisionNumber ?? 0} will become the official customer proposal.
                  <br />
                  <br />
                  Your quotation will remain editable so you can prepare future revisions if required.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {publishError && <p className="text-xs text-rose-600 font-semibold">{publishError}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={publishing}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handlePublish} disabled={publishing}>
                  {publishing ? 'Publishing...' : 'Publish Proposal'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
