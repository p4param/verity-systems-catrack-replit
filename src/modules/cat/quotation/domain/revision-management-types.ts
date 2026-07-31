// QM-WP04C — Revision Management.
// Read-only workspace over the publication model established in QM-WP04A —
// no new revision/publication concepts are introduced here, only a business
// view onto the existing cat_quotations, cat_quotation_revisions, and
// cat_quotation_publications data.

import { QuotationStatus } from '@/modules/cat/quotation/domain/quotation-types';
import { ProposalPublicationSnapshot } from '@/modules/cat/quotation/domain/proposal-publication-types';

export interface WorkingDraftSummary {
  status: QuotationStatus;
  lastModifiedAt: string;
  currentRevisionNumber: number;
  hasUnpublishedChanges: boolean;
}

export type PublishedRevisionStatus = 'CURRENT_PUBLISHED' | 'SUPERSEDED';

export const PUBLISHED_REVISION_STATUS_LABELS: Record<PublishedRevisionStatus, string> = {
  CURRENT_PUBLISHED: 'Current Published',
  SUPERSEDED: 'Superseded',
};

export interface PublishedRevisionSummary {
  id: string;
  revisionNumber: number;
  publishedAt: string;
  publishedBy?: {
    id: string;
    fullName: string;
  };
  status: PublishedRevisionStatus;
}

// Fetched on demand from GET /api/cat/quotations/[id]/publications/[revisionNumber]
// — the Snapshot Viewer's and Comparison's shared data shape.
export interface PublicationDetail {
  id: string;
  revisionNumber: number;
  status: string;
  publishedAt: string;
  publishedBy?: {
    id: string;
    fullName: string;
  };
  snapshot: ProposalPublicationSnapshot;
}
