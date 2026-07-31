// QM-WP03D — Proposal Review Workspace.
// Read-only review dashboard. Owns no business data, persists nothing —
// this file only shapes the aggregated, derived response returned by the
// dedicated GET endpoint.

import { ProposalWorkspaceStatus } from '@/modules/cat/quotation/domain/quotation-types';
import { ProposalWorkspaceKey } from '@/modules/cat/quotation/domain/proposal-workspace-types';

export interface ProposalContentSummaryRow {
  key: ProposalWorkspaceKey;
  label: string;
  status: ProposalWorkspaceStatus;
}

export interface CommercialPricingReview {
  chargesTotal: number;
  discountTotal: number;
  adjustmentTotal: number;
  grandTotal: number;
  status: ProposalWorkspaceStatus;
}

export interface CommercialTermsReview {
  validUntil?: string;
  paymentMethod?: string;
  advanceRequired?: boolean;
  currencyCode: string;
  status: ProposalWorkspaceStatus;
}

export interface ProposalReviewData {
  proposalContent: ProposalContentSummaryRow[];
  commercialPricing: CommercialPricingReview;
  commercialTerms: CommercialTermsReview;
  overallReady: boolean;
  outstandingWorkspaces: string[];
}
