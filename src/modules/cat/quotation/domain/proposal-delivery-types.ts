// QM-WP04B — Customer Delivery.
// Delivers a published proposal revision to a customer. Never a working
// draft — every delivery is anchored to an already-published revision
// number (enforced by the DB's composite FK to cat_quotation_publications).

export type DeliveryChannel = 'EMAIL' | 'PDF_DOWNLOAD';

export const DELIVERY_CHANNEL_LABELS: Record<DeliveryChannel, string> = {
  EMAIL: 'Email',
  PDF_DOWNLOAD: 'PDF Download',
};

export type DeliveryStatus = 'SENT' | 'FAILED' | 'DOWNLOADED';

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  SENT: 'Sent',
  FAILED: 'Failed',
  DOWNLOADED: 'Downloaded',
};

export interface DeliveryRecipientInput {
  name: string;
  email: string;
}

export interface ProposalDelivery {
  id: string;
  revisionNumber: number;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  recipientName: string;
  recipientEmail: string;
  subject?: string;
  message?: string;
  deliveredAt: string;
  deliveredBy?: {
    id: string;
    fullName: string;
  };
}

// Populated from the Quotation's linked Relationship's contacts
// (cat_contacts, joined via cat_quotations -> cat_inquiries -> relationship_id).
export interface RelationshipContactOption {
  id: string;
  name: string;
  email?: string;
  role?: string;
  isPrimary: boolean;
}
