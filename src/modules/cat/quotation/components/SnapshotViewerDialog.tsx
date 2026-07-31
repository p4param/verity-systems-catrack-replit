'use client';

import React from 'react';
import { CheckCircle2, FileText, Printer } from 'lucide-react';

import { PublicationDetail } from '@/modules/cat/quotation/domain/revision-management-types';
import { formatCurrency } from '@/modules/cat/quotation/domain/proposal-pricing-types';
import { PAYMENT_METHOD_LABELS, CommercialPaymentMethod, formatAdvanceValue } from '@/modules/cat/quotation/domain/commercial-terms-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PrintableProposalLayout } from '@/modules/cat/quotation/components/PrintableProposalLayout';

interface SnapshotViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publication: PublicationDetail | null;
  loading: boolean;
  // Optional — used only to title the printable document (see
  // PrintableProposalLayout). Callers that don't have the Quotation's title
  // handy simply omit these; the on-screen dialog is unaffected either way.
  quotationTitle?: string;
  quotationNumber?: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</div>
      {children}
    </div>
  );
}

// QM-WP04C — Revision Management: Snapshot Viewer.
// Read-only rendering of an immutable ProposalPublication snapshot. No
// editing controls of any kind — this component never calls a mutating
// endpoint. QM-WP04B (Customer Delivery) reuses this exact component for
// its PDF Download channel rather than duplicating it.
//
// Product Review correction: window.print() must never print the ERP
// shell. The on-screen dialog below is NOT what gets printed — a separate,
// screen-hidden PrintableProposalLayout is rendered alongside it
// (`.printable-proposal`, see src/app/globals.css), and that is the only
// subtree the global print stylesheet makes visible. Kept as a sibling of
// <Dialog>, not nested inside DialogContent, so it isn't subject to the
// dialog's own `position: fixed` box during print.
export function SnapshotViewerDialog({
  open,
  onOpenChange,
  publication,
  loading,
  quotationTitle,
  quotationNumber,
}: SnapshotViewerDialogProps) {
  const snapshot = publication?.snapshot;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {publication ? `Revision ${publication.revisionNumber}` : 'Published Snapshot'}
          </DialogTitle>
          {publication && (
            <DialogDescription asChild>
              <div className="space-y-1.5 pt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Published
                </span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs pt-0.5">
                  <div>
                    <span className="text-muted-foreground">Published At:</span>{' '}
                    <span className="font-semibold text-foreground">{new Date(publication.publishedAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Published By:</span>{' '}
                    <span className="font-semibold text-foreground">{publication.publishedBy?.fullName || 'Unknown'}</span>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground/80 italic pt-0.5">Read-only — this snapshot is immutable.</div>
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        {loading || !snapshot ? (
          <p className="text-xs text-muted-foreground animate-pulse">Loading snapshot...</p>
        ) : (
          <div className="space-y-6">
            <Section title="Executive Summary">
              <p className="text-xs text-foreground whitespace-pre-wrap">
                {snapshot.proposalContent.executiveSummary.proposalObjective || 'Not set'}
              </p>
            </Section>

            <Section title="Scope of Services">
              {snapshot.proposalContent.scopeOfServices.length === 0 ? (
                <p className="text-xs text-muted-foreground">No service blocks.</p>
              ) : (
                <div className="space-y-2">
                  {snapshot.proposalContent.scopeOfServices.map((block, i) => (
                    <div key={i} className="border border-border/30 rounded-lg p-3">
                      <div className="text-xs font-bold text-foreground">{block.blockTitle}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{block.customerDescription}</div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Proposal Narrative">
              <p className="text-xs text-foreground whitespace-pre-wrap">
                {snapshot.proposalContent.proposalNarrative.proposalNarrative || 'Not set'}
              </p>
            </Section>

            <Section title="Proposal Highlights">
              {snapshot.proposalContent.proposalHighlights.length === 0 ? (
                <p className="text-xs text-muted-foreground">No highlights.</p>
              ) : (
                <div className="space-y-2">
                  {snapshot.proposalContent.proposalHighlights.map((h, i) => (
                    <div key={i} className="border border-border/30 rounded-lg p-3">
                      <div className="text-xs font-bold text-foreground">{h.highlightTitle}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{h.highlightDescription}</div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Assumptions & Exclusions">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground/70 uppercase mb-1">Assumptions</div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {snapshot.proposalContent.assumptionsExclusions.assumptions.map((a, i) => (
                      <li key={i} className="text-xs text-foreground">
                        {a.statement}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground/70 uppercase mb-1">Exclusions</div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {snapshot.proposalContent.assumptionsExclusions.exclusions.map((e, i) => (
                      <li key={i} className="text-xs text-foreground">
                        {e.statement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Section>

            <Section title="Commercial Pricing">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-[10px] text-muted-foreground/70 uppercase">Charges</div>
                  <div className="font-bold text-foreground">{formatCurrency(snapshot.pricingSummary.chargesTotal)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground/70 uppercase">Discounts</div>
                  <div className="font-bold text-foreground">{formatCurrency(snapshot.pricingSummary.discountTotal)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground/70 uppercase">Adjustments</div>
                  <div className="font-bold text-foreground">{formatCurrency(snapshot.pricingSummary.adjustmentTotal)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground/70 uppercase">Subtotal</div>
                  <div className="font-bold text-foreground">{formatCurrency(snapshot.pricingSummary.subtotal)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground/70 uppercase">GST</div>
                  <div className="font-bold text-foreground">{formatCurrency(snapshot.pricingSummary.gstAmount)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-primary/80 uppercase font-bold">Grand Total</div>
                  <div className="text-base font-black text-primary">{formatCurrency(snapshot.pricingSummary.grandTotal)}</div>
                </div>
              </div>
            </Section>

            <Section title="Commercial Terms">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-[10px] text-muted-foreground/70 uppercase">Valid Until</div>
                  <div className="font-bold text-foreground">
                    {snapshot.commercialTerms.validUntil ? new Date(snapshot.commercialTerms.validUntil).toLocaleDateString() : 'Not set'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground/70 uppercase">Payment Method</div>
                  <div className="font-bold text-foreground">
                    {snapshot.commercialTerms.paymentMethod
                      ? PAYMENT_METHOD_LABELS[snapshot.commercialTerms.paymentMethod as CommercialPaymentMethod] ||
                        snapshot.commercialTerms.paymentMethod
                      : 'Not set'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground/70 uppercase">Currency</div>
                  <div className="font-bold text-foreground">{snapshot.commercialTerms.currencyCode}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground/70 uppercase">Advance Required</div>
                  <div className="font-bold text-foreground">
                    {snapshot.commercialTerms.advanceRequired
                      ? `Yes${
                          snapshot.commercialTerms.advanceValue !== undefined
                            ? ` — ${formatAdvanceValue(snapshot.commercialTerms.advanceType, snapshot.commercialTerms.advanceValue)}`
                            : ''
                        }`
                      : 'No'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground/70 uppercase">Balance Payment</div>
                  <div className="font-bold text-foreground">{snapshot.commercialTerms.balancePayment || 'Not set'}</div>
                </div>
              </div>
            </Section>

            <Section title="Terms & Conditions">
              <p className="text-[11px] text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {snapshot.termsAndConditions || 'Not set'}
              </p>
            </Section>
          </div>
        )}

        {snapshot && (
          <DialogFooter>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer hover:opacity-90 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save as PDF
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>

    {/* Screen-hidden; becomes the ONLY visible content when printing. */}
    {snapshot && publication && (
      <div className="hidden print:block printable-proposal">
        <PrintableProposalLayout
          quotationTitle={quotationTitle}
          quotationNumber={quotationNumber}
          revisionNumber={publication.revisionNumber}
          publishedAt={publication.publishedAt}
          publishedByName={publication.publishedBy?.fullName}
          snapshot={snapshot}
        />
      </div>
    )}
    </>
  );
}
