// QM-WP04A — Proposal Publication.
// Publishing a Quotation creates an immutable ProposalPublication snapshot
// and advances the Quotation to a new QuotationRevision. The snapshot is a
// point-in-time copy of Proposal Content, Commercial Pricing, Commercial
// Terms, Terms & Conditions, and the Pricing Summary — never re-derived
// once written. The Quotation itself remains editable; no revision history
// lives on the Quotation entity.

export interface ProposalPublicationSnapshot {
  proposalContent: {
    executiveSummary: {
      proposalObjective?: string;
      executiveNotes?: string;
    };
    scopeOfServices: Array<{
      blockTitle: string;
      customerDescription: string;
      internalNotes?: string;
    }>;
    proposalNarrative: {
      proposalNarrative?: string;
      internalAuthorNotes?: string;
    };
    proposalHighlights: Array<{
      highlightTitle: string;
      highlightDescription: string;
      internalNotes?: string;
    }>;
    assumptionsExclusions: {
      assumptions: Array<{ statement: string }>;
      exclusions: Array<{ statement: string }>;
    };
  };
  commercialPricing: {
    charges: Array<{ description: string; amount: number }>;
    discounts: Array<{ description: string; amount: number }>;
    adjustments: Array<{ description: string; amount: number }>;
  };
  commercialTerms: {
    validUntil?: string;
    validityNotes?: string;
    paymentMethod?: string;
    advanceRequired?: boolean;
    advanceType?: string;
    advanceValue?: number;
    balancePayment?: string;
    commercialNotes?: string;
    currencyCode: string;
  };
  termsAndConditions?: string;
  pricingSummary: {
    chargesTotal: number;
    discountTotal: number;
    adjustmentTotal: number;
    subtotal: number;
    gstAmount: number;
    grandTotal: number;
  };
}

export type ProposalPublicationStatus = 'PUBLISHED';

export interface ProposalPublication {
  id: string;
  quotationId: string;
  revisionNumber: number;
  status: ProposalPublicationStatus;
  snapshot: ProposalPublicationSnapshot;
  publishedAt: string;
  publishedBy?: string;
}
