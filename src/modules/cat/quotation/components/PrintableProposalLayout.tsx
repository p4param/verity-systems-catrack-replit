import React from 'react';

import { ProposalPublicationSnapshot } from '@/modules/cat/quotation/domain/proposal-publication-types';
import { formatCurrency } from '@/modules/cat/quotation/domain/proposal-pricing-types';
import { PAYMENT_METHOD_LABELS, CommercialPaymentMethod, formatAdvanceValue } from '@/modules/cat/quotation/domain/commercial-terms-types';

interface PrintableProposalLayoutProps {
  quotationTitle?: string;
  quotationNumber?: string;
  revisionNumber: number;
  publishedAt: string;
  publishedByName?: string;
  snapshot: ProposalPublicationSnapshot;
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ breakInside: 'avoid' }} className="pt-6 first:pt-0">
      <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500 border-b border-neutral-300 pb-1.5 mb-3">{title}</h2>
      {children}
    </section>
  );
}

// QM-WP04B — Customer Delivery: Printable Proposal Layout.
// The ONLY subtree that becomes visible when window.print() is called (see
// the `.printable-proposal` rule in src/app/globals.css) — everything else
// in the ERP shell (header, sidebar, tabs, dialog chrome, buttons) is
// hidden. Renders exactly the customer-facing content: no internal notes,
// no workspace status, no editing affordances. Kept out of the screen flow
// entirely (`hidden print:block`) by its caller.
export function PrintableProposalLayout({
  quotationTitle,
  quotationNumber,
  revisionNumber,
  publishedAt,
  publishedByName,
  snapshot,
}: PrintableProposalLayoutProps) {
  return (
    <div className="bg-white text-black text-[13px] leading-relaxed max-w-3xl mx-auto">
      {/* Proposal Title + Revision Information + Published Metadata */}
      <header className="pb-5 mb-2 border-b-2 border-neutral-800">
        <h1 className="text-2xl font-bold text-neutral-900">{quotationTitle || 'Proposal'}</h1>
        {quotationNumber && <div className="text-xs text-neutral-500 mt-0.5">{quotationNumber}</div>}
        <div className="flex items-center gap-4 mt-3 text-xs text-neutral-600">
          <span>
            <span className="font-semibold text-neutral-800">Revision:</span> {revisionNumber}
          </span>
          <span>
            <span className="font-semibold text-neutral-800">Published:</span> {new Date(publishedAt).toLocaleString()}
          </span>
          {publishedByName && (
            <span>
              <span className="font-semibold text-neutral-800">Prepared By:</span> {publishedByName}
            </span>
          )}
        </div>
      </header>

      <PrintSection title="Executive Summary">
        <p className="whitespace-pre-wrap">{snapshot.proposalContent.executiveSummary.proposalObjective || 'Not provided.'}</p>
      </PrintSection>

      <PrintSection title="Scope of Services">
        {snapshot.proposalContent.scopeOfServices.length === 0 ? (
          <p className="text-neutral-500">Not provided.</p>
        ) : (
          <div className="space-y-3">
            {snapshot.proposalContent.scopeOfServices.map((block, i) => (
              <div key={i} style={{ breakInside: 'avoid' }}>
                <div className="font-semibold text-neutral-900">{block.blockTitle}</div>
                <div className="text-neutral-700">{block.customerDescription}</div>
              </div>
            ))}
          </div>
        )}
      </PrintSection>

      <PrintSection title="Proposal Narrative">
        <p className="whitespace-pre-wrap">{snapshot.proposalContent.proposalNarrative.proposalNarrative || 'Not provided.'}</p>
      </PrintSection>

      <PrintSection title="Proposal Highlights">
        {snapshot.proposalContent.proposalHighlights.length === 0 ? (
          <p className="text-neutral-500">Not provided.</p>
        ) : (
          <div className="space-y-3">
            {snapshot.proposalContent.proposalHighlights.map((h, i) => (
              <div key={i} style={{ breakInside: 'avoid' }}>
                <div className="font-semibold text-neutral-900">{h.highlightTitle}</div>
                <div className="text-neutral-700">{h.highlightDescription}</div>
              </div>
            ))}
          </div>
        )}
      </PrintSection>

      <PrintSection title="Assumptions & Exclusions">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-bold uppercase text-neutral-500 mb-1.5">Assumptions</div>
            {snapshot.proposalContent.assumptionsExclusions.assumptions.length === 0 ? (
              <p className="text-neutral-500">None.</p>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {snapshot.proposalContent.assumptionsExclusions.assumptions.map((a, i) => (
                  <li key={i}>{a.statement}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-neutral-500 mb-1.5">Exclusions</div>
            {snapshot.proposalContent.assumptionsExclusions.exclusions.length === 0 ? (
              <p className="text-neutral-500">None.</p>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {snapshot.proposalContent.assumptionsExclusions.exclusions.map((e, i) => (
                  <li key={i}>{e.statement}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </PrintSection>

      <PrintSection title="Commercial Pricing">
        <table className="w-full text-left" style={{ breakInside: 'avoid' }}>
          <tbody>
            <tr>
              <td className="py-1 text-neutral-600">Charges</td>
              <td className="py-1 text-right font-medium">{formatCurrency(snapshot.pricingSummary.chargesTotal)}</td>
            </tr>
            <tr>
              <td className="py-1 text-neutral-600">Discounts</td>
              <td className="py-1 text-right font-medium">{formatCurrency(snapshot.pricingSummary.discountTotal)}</td>
            </tr>
            <tr>
              <td className="py-1 text-neutral-600">Adjustments</td>
              <td className="py-1 text-right font-medium">{formatCurrency(snapshot.pricingSummary.adjustmentTotal)}</td>
            </tr>
            <tr>
              <td className="py-1 text-neutral-600">Subtotal</td>
              <td className="py-1 text-right font-medium">{formatCurrency(snapshot.pricingSummary.subtotal)}</td>
            </tr>
            <tr>
              <td className="py-1 text-neutral-600">GST</td>
              <td className="py-1 text-right font-medium">{formatCurrency(snapshot.pricingSummary.gstAmount)}</td>
            </tr>
            <tr className="border-t-2 border-neutral-800">
              <td className="pt-2 font-bold text-neutral-900">Grand Total</td>
              <td className="pt-2 text-right font-bold text-neutral-900 text-base">
                {formatCurrency(snapshot.pricingSummary.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </PrintSection>

      <PrintSection title="Commercial Terms">
        <table className="w-full text-left" style={{ breakInside: 'avoid' }}>
          <tbody>
            <tr>
              <td className="py-1 pr-4 text-neutral-600 w-1/3">Valid Until</td>
              <td className="py-1 font-medium">
                {snapshot.commercialTerms.validUntil ? new Date(snapshot.commercialTerms.validUntil).toLocaleDateString() : 'Not set'}
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-neutral-600">Payment Method</td>
              <td className="py-1 font-medium">
                {snapshot.commercialTerms.paymentMethod
                  ? PAYMENT_METHOD_LABELS[snapshot.commercialTerms.paymentMethod as CommercialPaymentMethod] ||
                    snapshot.commercialTerms.paymentMethod
                  : 'Not set'}
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-neutral-600">Advance Required</td>
              <td className="py-1 font-medium">
                {snapshot.commercialTerms.advanceRequired
                  ? `Yes${
                      snapshot.commercialTerms.advanceValue !== undefined
                        ? ` — ${formatAdvanceValue(snapshot.commercialTerms.advanceType, snapshot.commercialTerms.advanceValue)}`
                        : ''
                    }`
                  : 'No'}
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-neutral-600">Balance Payment</td>
              <td className="py-1 font-medium">{snapshot.commercialTerms.balancePayment || 'Not set'}</td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-neutral-600">Currency</td>
              <td className="py-1 font-medium">{snapshot.commercialTerms.currencyCode}</td>
            </tr>
          </tbody>
        </table>
      </PrintSection>

      <PrintSection title="Terms & Conditions">
        <p className="whitespace-pre-wrap text-neutral-700">{snapshot.termsAndConditions || 'Not provided.'}</p>
      </PrintSection>
    </div>
  );
}
