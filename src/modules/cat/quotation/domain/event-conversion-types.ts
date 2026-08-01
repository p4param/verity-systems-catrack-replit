// QM-WP04E — Event Conversion.
// The Sales -> Operations transition: converts an Accepted, Published
// proposal revision into a new Event (see cat/event/domain/event-types.ts
// for the Event entity itself). Not an Event Creation wizard — a one-time
// business transition, gated on three preconditions and never repeatable
// for the same Quotation.

import { CustomerDecisionType } from '@/modules/cat/quotation/domain/customer-decision-types';

export interface ConversionPublishedRevisionSummary {
  revisionNumber: number;
  publishedAt: string;
  publishedBy?: {
    id: string;
    fullName: string;
  };
}

export interface ConversionCurrentDecision {
  decision: CustomerDecisionType;
  notes?: string;
  recordedAt: string;
}

export interface ConversionRecord {
  eventId: string;
  eventNumber: string;
  eventStatus: string;
  originQuotationRevision: number;
  convertedAt: string;
  convertedBy?: {
    id: string;
    fullName: string;
  };
}

// GET /api/cat/quotations/[id]/convert response shape.
export interface ConversionEligibility {
  eligible: boolean;
  reasons: string[];
  currentPublishedRevision: ConversionPublishedRevisionSummary | null;
  currentDecision: ConversionCurrentDecision | null;
  alreadyConverted: boolean;
  conversion: ConversionRecord | null;
}

// Read-only preview of the operational data that will be copied onto the
// new Event — sourced from the Quotation's already-loaded discovery
// context and the current published snapshot's commercial totals, not
// fetched separately.
export interface EventPreviewData {
  relationshipName: string;
  eventName: string;
  eventDate?: string;
  venue?: string;
  guestCount?: number;
  eventType?: string;
  grandTotal?: number;
  currencyCode: string;
  sourceRevisionNumber: number;
}
