'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Circle, Eye, MessageSquareText, Sparkles } from 'lucide-react';

import { QuotationDetail } from '@/modules/cat/quotation/domain/quotation-types';
import { PublicationDetail } from '@/modules/cat/quotation/domain/revision-management-types';
import { ConversionEligibility } from '@/modules/cat/quotation/domain/event-conversion-types';
import { CUSTOMER_DECISION_BADGE_CLASS, CUSTOMER_DECISION_LABELS } from '@/modules/cat/quotation/domain/customer-decision-types';
import { formatCurrency } from '@/modules/cat/quotation/domain/proposal-pricing-types';
import { EVENT_STATUS_LABELS } from '@/modules/cat/event/domain/event-types';
import { SnapshotViewerDialog } from '@/modules/cat/quotation/components/SnapshotViewerDialog';
import { CurrentPublishedRevisionPanel } from '@/modules/cat/quotation/components/CurrentPublishedRevisionPanel';
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

interface EventConversionWorkspaceProps {
  quotation: QuotationDetail;
}

interface ConvertSuccess {
  eventId: string;
  eventNumber: string;
  status: string;
}

// QM-WP04E — Event Conversion Workspace.
// The Sales -> Operations transition. Not an Event Creation wizard — every
// field shown is a read-only confirmation of what already exists (the
// Published Proposal, the Customer Decision) or what will be copied
// verbatim onto the new Event. No proposal field is editable here.
// Reuses SnapshotViewerDialog and CurrentPublishedRevisionPanel rather
// than duplicating either. Out of scope, per the Engineering Package:
// Event Planning, Menu Planning, Procurement, Kitchen, Billing, Contracts,
// Customer Portal, Electronic Signatures.
export function EventConversionWorkspace({ quotation }: EventConversionWorkspaceProps) {
  const router = useRouter();
  const [eligibility, setEligibility] = useState<ConversionEligibility | null>(null);
  const [loading, setLoading] = useState(true);

  const [publication, setPublication] = useState<PublicationDetail | null>(null);
  const [publicationLoading, setPublicationLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState('');
  const [convertSuccess, setConvertSuccess] = useState<ConvertSuccess | null>(null);

  const loadEligibility = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/convert`);
      const data: { success: boolean } & Partial<ConversionEligibility> = await res.json();
      if (data.success) setEligibility(data as unknown as ConversionEligibility);
    } catch (err) {
      console.error('Failed to load Event Conversion eligibility:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotation.id]);

  const revisionToView = eligibility?.alreadyConverted
    ? eligibility.conversion?.originQuotationRevision
    : eligibility?.currentPublishedRevision?.revisionNumber;

  useEffect(() => {
    if (!revisionToView) return;
    setPublicationLoading(true);
    fetch(`/api/cat/quotations/${quotation.id}/publications/${revisionToView}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPublication(data.publication);
      })
      .catch((err) => console.error('Failed to load snapshot for Event Conversion:', err))
      .finally(() => setPublicationLoading(false));
  }, [quotation.id, revisionToView]);

  const handleConvert = async () => {
    setConverting(true);
    setConvertError('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/convert`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setConvertSuccess({ eventId: data.event.id, eventNumber: data.event.eventNumber, status: data.event.status });
      } else {
        setConvertError(data.error || 'Failed to convert this Quotation to an Event.');
      }
    } catch (err: any) {
      setConvertError(err.message || 'Failed to convert this Quotation to an Event.');
    } finally {
      setConverting(false);
    }
  };

  const closeConvertDialog = () => {
    setShowConvertDialog(false);
    setConvertError('');
    if (convertSuccess) {
      setConvertSuccess(null);
      loadEligibility();
    }
  };

  if (loading || !eligibility) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Event Conversion...</div>;
  }

  // Post Conversion State — permanent, read-only audit page. Never falls
  // back to the conversion form again, even after a reload.
  if (eligibility.alreadyConverted && eligibility.conversion) {
    const conv = eligibility.conversion;
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-border/40 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-extrabold text-foreground">Sales → Operations Transition Complete</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="text-xs font-bold text-emerald-600">Event Created Successfully</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Event Number</div>
                <div className="font-bold text-foreground">{conv.eventNumber}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Current Status</div>
                <div className="font-bold text-foreground">{EVENT_STATUS_LABELS[conv.eventStatus as 'PLANNING'] || conv.eventStatus}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Converted At</div>
                <div className="font-bold text-foreground">{new Date(conv.convertedAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Converted By</div>
                <div className="font-bold text-foreground">{conv.convertedBy?.fullName || 'Unknown'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => router.push(`/cat/events/${conv.eventId}`)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer hover:opacity-90 transition"
              >
                Open Event
              </button>
              <button
                type="button"
                onClick={() => setViewOpen(true)}
                disabled={!publication}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-muted/50 text-foreground text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40 hover:bg-muted transition"
              >
                <Eye className="w-3.5 h-3.5" />
                View Snapshot
              </button>
            </div>
          </div>
        </div>

        <SnapshotViewerDialog
          open={viewOpen}
          onOpenChange={setViewOpen}
          publication={publication}
          loading={publicationLoading}
          quotationTitle={quotation.title}
          quotationNumber={quotation.quotationNumber}
        />
      </div>
    );
  }

  const snapshot = publication?.snapshot;
  const grandTotal = snapshot?.pricingSummary.grandTotal;
  const currencyCode = snapshot?.commercialTerms.currencyCode || 'INR';

  return (
    <div className="space-y-4">
      <CurrentPublishedRevisionPanel
        latestPublished={eligibility.currentPublishedRevision}
        onViewSnapshot={() => setViewOpen(true)}
        emptyMessage="No published revision yet. Publish this proposal first (Proposal Review → Publish Proposal) before it can be converted to an Event."
        quotationNumber={quotation.quotationNumber}
      />

      {eligibility.currentPublishedRevision && (
        <>
          {/* Customer Decision Summary */}
          <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border/40 flex items-center gap-2">
              <MessageSquareText className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-extrabold text-foreground">Customer Decision Summary</h3>
            </div>
            <div className="p-5">
              {eligibility.currentDecision ? (
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border ${CUSTOMER_DECISION_BADGE_CLASS[eligibility.currentDecision.decision]}`}
                  >
                    {CUSTOMER_DECISION_LABELS[eligibility.currentDecision.decision]}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Recorded {new Date(eligibility.currentDecision.recordedAt).toLocaleString()}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No Customer Decision has been recorded yet.</p>
              )}
              {eligibility.currentDecision?.notes && (
                <p className="text-[11px] text-muted-foreground mt-2 whitespace-pre-wrap">{eligibility.currentDecision.notes}</p>
              )}
            </div>
          </div>

          {/* Event Preview */}
          <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border/40 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-extrabold text-foreground">Event Preview</h3>
              <span className="text-[10px] font-medium text-muted-foreground normal-case">(what will be created)</span>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Relationship</div>
                <div className="font-bold text-foreground">{quotation.relationshipName || 'Unassigned'}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Event Name</div>
                <div className="font-bold text-foreground">{quotation.title}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Event Type</div>
                <div className="font-bold text-foreground">{quotation.occasion || 'Not set'}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Event Date</div>
                <div className="font-bold text-foreground">
                  {quotation.eventDate ? new Date(quotation.eventDate).toLocaleDateString() : 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Venue</div>
                <div className="font-bold text-foreground">{quotation.venueName || 'Not set'}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Guest Count</div>
                <div className="font-bold text-foreground">{quotation.guestCount ?? 'Not set'}</div>
              </div>
              <div>
                <div className="text-[10px] text-primary/80 uppercase tracking-wide font-bold">Commercial Summary</div>
                <div className="text-base font-black text-primary">
                  {grandTotal !== undefined ? formatCurrency(grandTotal) : publicationLoading ? '…' : 'Not available'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Source Revision</div>
                <div className="font-bold text-foreground">Revision {eligibility.currentPublishedRevision.revisionNumber}</div>
              </div>
            </div>
          </div>

          {/* Conversion Summary + Convert to Event action */}
          <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border/40 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-extrabold text-foreground">Conversion Summary</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                {[
                  { met: !!eligibility.currentPublishedRevision, label: 'Current Published Proposal exists' },
                  {
                    met: eligibility.currentDecision?.decision === 'ACCEPTED',
                    label: 'Current Customer Decision = Accepted',
                  },
                  { met: true, label: 'Quotation has not already been converted' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-2 text-xs">
                    {row.met ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                    <span className={row.met ? 'text-foreground font-medium' : 'text-muted-foreground'}>{row.label}</span>
                  </div>
                ))}
              </div>

              {!eligibility.eligible && eligibility.reasons.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    {eligibility.reasons.map((reason) => (
                      <p key={reason} className="text-xs text-amber-700">
                        {reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowConvertDialog(true)}
                  disabled={!eligibility.eligible}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Convert to Event
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <SnapshotViewerDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        publication={publication}
        loading={publicationLoading}
        quotationTitle={quotation.title}
        quotationNumber={quotation.quotationNumber}
      />

      <AlertDialog open={showConvertDialog} onOpenChange={(open) => !open && closeConvertDialog()}>
        <AlertDialogContent>
          {convertSuccess ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Event Created
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-1 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Event Number</span>
                      <span className="font-bold text-foreground">{convertSuccess.eventNumber}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-bold text-foreground">{EVENT_STATUS_LABELS.PLANNING}</span>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={closeConvertDialog}>Return to Quotation</AlertDialogCancel>
                <AlertDialogAction onClick={() => router.push(`/cat/events/${convertSuccess.eventId}`)}>Open Event</AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Convert to Event?</AlertDialogTitle>
                <AlertDialogDescription>
                  This creates a new Event from Revision {eligibility.currentPublishedRevision?.revisionNumber} of this
                  proposal. A quotation can only be converted once — this action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {convertError && <p className="text-xs text-rose-600 font-semibold">{convertError}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={converting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    // AlertDialogAction closes the dialog by default on
                    // click (documented Radix behavior) — since converting
                    // is async and this dialog needs to stay open to show
                    // the success state afterward, the default close must
                    // be suppressed; closeConvertDialog is what actually
                    // dismisses it, explicitly, once the user is done.
                    e.preventDefault();
                    handleConvert();
                  }}
                  disabled={converting}
                >
                  {converting ? 'Converting...' : 'Convert to Event'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
