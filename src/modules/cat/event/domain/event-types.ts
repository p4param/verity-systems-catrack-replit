// QM-WP04E — Event Conversion.
// The Event entity created by converting an Accepted, Published proposal
// revision. Deliberately minimal: this Work Package ends immediately after
// successful creation. No planning, menu, procurement, kitchen, billing,
// contract, portal, or e-signature fields — those belong to future,
// separate Work Packages once this bounded context is genuinely needed.

export type EventStatus = 'PLANNING';

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  PLANNING: 'Planning',
};

export interface EventSummary {
  id: string;
  eventNumber: string;
  eventName: string;
  status: EventStatus;
  relationshipId: string;
  relationshipName: string;
  eventType?: string;
  eventDate?: string;
  venue?: string;
  guestCount?: number;
  grandTotal?: number;
  currencyCode: string;
  originQuotationId: string;
  originQuotationNumber: string;
  originQuotationRevision: number;
  createdAt: string;
}
