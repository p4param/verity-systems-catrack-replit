// QM-WP01 — Quotation Foundation
// Business flow: Relationship -> Inquiry -> Quotation (1..N) -> QuotationRevision (1..N)
//   -> Accepted Revision -> Event (future).
// This module implements the Quotation aggregate and the QuotationRevision
// aggregate at foundation level only — no pricing, no negotiation workflow,
// no version comparison. Status is persisted only; there is no automation.

export type QuotationStatus =
  | 'DRAFT'
  | 'INTERNAL_REVIEW'
  | 'SHARED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

// Purpose is informational only — it carries no business logic or validation
// branching anywhere in this Work Package.
export type QuotationPurpose =
  | 'STANDARD_PROPOSAL'
  | 'PREMIUM_PROPOSAL'
  | 'BUDGET_PROPOSAL'
  | 'ALTERNATIVE_VENUE'
  | 'ALTERNATIVE_MENU'
  | 'CUSTOMER_REVISION';

export interface Quotation {
  id: string;
  quotationNumber: string;
  inquiryId: string;
  title: string;
  purpose: QuotationPurpose;
  description?: string;
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// QM-WP02A — Proposal Builder Shell.
// A Proposal Workspace's progress is informational only: not approval, not
// workflow, not validation. "Ready" is always a user decision (Mark Ready),
// never computed automatically.
export type ProposalWorkspaceStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'READY';

export const PROPOSAL_WORKSPACE_STATUS_LABELS: Record<ProposalWorkspaceStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  READY: 'Ready',
};

// Executive Summary fields live directly on the Quotation entity per
// QM-WP02A's data model (no generic ProposalSection table).
export interface QuotationExecutiveSummary {
  proposalObjective?: string;
  executiveNotes?: string;
  executiveSummaryStatus: ProposalWorkspaceStatus;
}

// QM-WP02B-01 — Scope of Services owns its own workspace status column on
// the Quotation entity, same convention as Executive Summary. The Service
// Block list itself lives in its own dedicated entity/table, not here.
export interface QuotationScopeOfServices {
  scopeOfServicesStatus: ProposalWorkspaceStatus;
}

// QM-WP02B-02 — Proposal Narrative owns its own workspace status column,
// same convention. Only the status rides on the main Quotation detail
// response; the narrative content itself is fetched via the workspace's own
// dedicated GET endpoint (document-oriented, not embedded in every fetch).
export interface QuotationProposalNarrative {
  proposalNarrativeStatus: ProposalWorkspaceStatus;
}

// QM-WP02B-03 — Proposal Highlights owns its own workspace status column,
// same convention. The Highlight Card list itself lives in its own
// dedicated entity/table (ProposalHighlight), not here.
export interface QuotationProposalHighlights {
  proposalHighlightsStatus: ProposalWorkspaceStatus;
}

// QM-WP02B-04 — Assumptions & Exclusions owns a single workspace status
// column covering both of its sections (Assumptions + Exclusions are one
// workspace, not two). The Assumption/Exclusion lists themselves live in
// their own dedicated entities/tables, not here.
export interface QuotationAssumptionsExclusions {
  assumptionsExclusionsStatus: ProposalWorkspaceStatus;
}

// QuotationRevision is a foundation-level record only in QM-WP01: Revision 0
// is created automatically whenever a Quotation is created, and there is
// exactly one current revision. No revision workflow, comparison, or
// negotiation functionality exists at this stage.
export interface QuotationRevision {
  id: string;
  quotationId: string;
  revisionNumber: number;
  status: QuotationStatus;
  isCurrent: boolean;
  createdAt: string;
  createdBy?: string;
}

// Directory / list row shape — joins in customer (via Inquiry -> Relationship)
// and inquiry display fields, and the current revision number, without
// requiring the caller to perform separate lookups.
export interface QuotationListItem {
  id: string;
  quotationNumber: string;
  title: string;
  purpose: QuotationPurpose;
  status: QuotationStatus;
  inquiryId: string;
  inquiryNumber: string;
  inquiryTitle: string;
  relationshipId: string;
  relationshipName: string;
  currentRevisionNumber: number;
  createdAt: string;
  updatedAt: string;
}

// Full detail shape for the Quotation Workspace header + Proposal Builder.
// Discovery Context fields (occasion/eventDate/guestCount/venueName) are
// read-only, inherited from the linked Inquiry at fetch time — they are
// never copied/persisted onto the Quotation itself.
export interface QuotationDetail
  extends Quotation,
    QuotationExecutiveSummary,
    QuotationScopeOfServices,
    QuotationProposalNarrative,
    QuotationProposalHighlights,
    QuotationAssumptionsExclusions {
  inquiryNumber: string;
  inquiryTitle: string;
  relationshipId: string;
  relationshipName: string;
  currentRevision: QuotationRevision;
  occasion?: string;
  eventDate?: string;
  guestCount?: number;
  venueName?: string;
}

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  DRAFT: 'Draft',
  INTERNAL_REVIEW: 'Internal Review',
  SHARED: 'Shared',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

export const QUOTATION_PURPOSE_LABELS: Record<QuotationPurpose, string> = {
  STANDARD_PROPOSAL: 'Standard Proposal',
  PREMIUM_PROPOSAL: 'Premium Proposal',
  BUDGET_PROPOSAL: 'Budget Proposal',
  ALTERNATIVE_VENUE: 'Alternative Venue',
  ALTERNATIVE_MENU: 'Alternative Menu',
  CUSTOMER_REVISION: 'Customer Revision',
};
