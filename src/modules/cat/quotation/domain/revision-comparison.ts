// QM-WP04C — Revision Management: Comparison.
// "Show business differences only. No document diff." Structured business
// fields (totals, choices, counts) are compared value-for-value; free-text
// content (Executive Summary, Proposal Narrative, Terms & Conditions) is
// reduced to a Changed/Unchanged flag rather than a text diff. When changed,
// a short truncated preview snippet of each side is attached (UX Polish) —
// still not a diff: no alignment, no highlighting of the specific words that
// changed, just a glance at what each side currently reads like.

import { ProposalPublicationSnapshot } from '@/modules/cat/quotation/domain/proposal-publication-types';
import { formatCurrency } from '@/modules/cat/quotation/domain/proposal-pricing-types';
import { PAYMENT_METHOD_LABELS, CommercialPaymentMethod, formatAdvanceValue } from '@/modules/cat/quotation/domain/commercial-terms-types';

export interface ComparisonValueRow {
  kind: 'value';
  label: string;
  valueA: string;
  valueB: string;
  changed: boolean;
}

export interface ComparisonFlagRow {
  kind: 'flag';
  label: string;
  changed: boolean;
  snippetA?: string;
  snippetB?: string;
}

export type ComparisonRow = ComparisonValueRow | ComparisonFlagRow;

export interface ComparisonGroup {
  title: string;
  rows: ComparisonRow[];
}

const SNIPPET_LENGTH = 90;

function truncateSnippet(text: string | undefined): string | undefined {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > SNIPPET_LENGTH ? `${trimmed.slice(0, SNIPPET_LENGTH)}…` : trimmed;
}

function valueRow(label: string, a: string | number | undefined, b: string | number | undefined): ComparisonValueRow {
  const valueA = a === undefined || a === '' ? '—' : String(a);
  const valueB = b === undefined || b === '' ? '—' : String(b);
  return { kind: 'value', label, valueA, valueB, changed: valueA !== valueB };
}

function flagRow(label: string, a: string | undefined, b: string | undefined): ComparisonFlagRow {
  const changed = (a || '') !== (b || '');
  return {
    kind: 'flag',
    label,
    changed,
    snippetA: changed ? truncateSnippet(a) : undefined,
    snippetB: changed ? truncateSnippet(b) : undefined,
  };
}

export function compareProposalSnapshots(
  a: ProposalPublicationSnapshot,
  b: ProposalPublicationSnapshot,
): ComparisonGroup[] {
  return [
    {
      title: 'Commercial Pricing',
      rows: [
        valueRow('Charges Total', formatCurrency(a.pricingSummary.chargesTotal), formatCurrency(b.pricingSummary.chargesTotal)),
        valueRow('Discount Total', formatCurrency(a.pricingSummary.discountTotal), formatCurrency(b.pricingSummary.discountTotal)),
        valueRow('Adjustment Total', formatCurrency(a.pricingSummary.adjustmentTotal), formatCurrency(b.pricingSummary.adjustmentTotal)),
        valueRow('Subtotal', formatCurrency(a.pricingSummary.subtotal), formatCurrency(b.pricingSummary.subtotal)),
        valueRow('GST Amount', formatCurrency(a.pricingSummary.gstAmount), formatCurrency(b.pricingSummary.gstAmount)),
        valueRow('Grand Total', formatCurrency(a.pricingSummary.grandTotal), formatCurrency(b.pricingSummary.grandTotal)),
      ],
    },
    {
      title: 'Commercial Terms',
      rows: [
        valueRow('Valid Until', a.commercialTerms.validUntil, b.commercialTerms.validUntil),
        valueRow(
          'Payment Method',
          a.commercialTerms.paymentMethod
            ? PAYMENT_METHOD_LABELS[a.commercialTerms.paymentMethod as CommercialPaymentMethod] || a.commercialTerms.paymentMethod
            : undefined,
          b.commercialTerms.paymentMethod
            ? PAYMENT_METHOD_LABELS[b.commercialTerms.paymentMethod as CommercialPaymentMethod] || b.commercialTerms.paymentMethod
            : undefined,
        ),
        valueRow(
          'Advance Required',
          a.commercialTerms.advanceRequired === undefined ? undefined : a.commercialTerms.advanceRequired ? 'Yes' : 'No',
          b.commercialTerms.advanceRequired === undefined ? undefined : b.commercialTerms.advanceRequired ? 'Yes' : 'No',
        ),
        valueRow(
          'Advance Value',
          a.commercialTerms.advanceValue === undefined
            ? undefined
            : formatAdvanceValue(a.commercialTerms.advanceType, a.commercialTerms.advanceValue),
          b.commercialTerms.advanceValue === undefined
            ? undefined
            : formatAdvanceValue(b.commercialTerms.advanceType, b.commercialTerms.advanceValue),
        ),
        valueRow('Balance Payment', a.commercialTerms.balancePayment, b.commercialTerms.balancePayment),
        valueRow('Currency', a.commercialTerms.currencyCode, b.commercialTerms.currencyCode),
      ],
    },
    {
      title: 'Proposal Content',
      rows: [
        valueRow('Scope of Services Blocks', a.proposalContent.scopeOfServices.length, b.proposalContent.scopeOfServices.length),
        valueRow('Proposal Highlights', a.proposalContent.proposalHighlights.length, b.proposalContent.proposalHighlights.length),
        valueRow(
          'Assumptions',
          a.proposalContent.assumptionsExclusions.assumptions.length,
          b.proposalContent.assumptionsExclusions.assumptions.length,
        ),
        valueRow(
          'Exclusions',
          a.proposalContent.assumptionsExclusions.exclusions.length,
          b.proposalContent.assumptionsExclusions.exclusions.length,
        ),
        flagRow('Executive Summary', a.proposalContent.executiveSummary.proposalObjective, b.proposalContent.executiveSummary.proposalObjective),
        flagRow('Proposal Narrative', a.proposalContent.proposalNarrative.proposalNarrative, b.proposalContent.proposalNarrative.proposalNarrative),
        flagRow('Terms & Conditions', a.termsAndConditions, b.termsAndConditions),
      ],
    },
  ];
}
