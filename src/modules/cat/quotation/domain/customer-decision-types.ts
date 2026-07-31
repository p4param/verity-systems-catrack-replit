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
