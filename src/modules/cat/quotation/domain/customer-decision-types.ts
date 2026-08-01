// QM-WP04D — Customer Decision.
// Records what the customer decided about a published proposal revision.
// Never against a working draft — every decision is anchored to an
// already-published revision number (same enforcement pattern as
// QM-WP04B's ProposalDelivery: a composite FK to cat_quotation_publications).
// Immutable, append-only: no PATCH/PUT/DELETE endpoint exists for this
// entity anywhere in this Work Package.

export type CustomerDecisionType =
  | 'PENDING_RESPONSE'
  | 'ACCEPTED'
  | 'ACCEPTED_WITH_CONDITIONS'
  | 'REVISION_REQUESTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'WITHDRAWN';

export const CUSTOMER_DECISION_LABELS: Record<CustomerDecisionType, string> = {
  PENDING_RESPONSE: 'Pending Response',
  ACCEPTED: 'Accepted',
  ACCEPTED_WITH_CONDITIONS: 'Accepted with Conditions',
  REVISION_REQUESTED: 'Revision Requested',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  WITHDRAWN: 'Withdrawn',
};

// Shared badge styling — used by CustomerDecisionWorkspace (recording UI)
// and, from QM-WP04E, EventConversionWorkspace's Customer Decision Summary.
// Moved here rather than duplicated once a second consumer needed it.
export const CUSTOMER_DECISION_BADGE_CLASS: Record<CustomerDecisionType, string> = {
  PENDING_RESPONSE: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ACCEPTED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  ACCEPTED_WITH_CONDITIONS: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  REVISION_REQUESTED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  EXPIRED: 'bg-muted text-muted-foreground border-border/40',
  WITHDRAWN: 'bg-muted text-muted-foreground border-border/40',
};

export interface CustomerDecisionRecord {
  id: string;
  revisionNumber: number;
  decision: CustomerDecisionType;
  notes?: string;
  recordedAt: string;
  recordedBy?: {
    id: string;
    fullName: string;
  };
}
