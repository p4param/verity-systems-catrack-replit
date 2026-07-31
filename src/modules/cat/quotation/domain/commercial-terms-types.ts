// QM-WP03B — Commercial Terms Workspace.
// All fields live directly on the Quotation entity per the frozen
// engineering package: no child entities, no generic commercial
// abstractions. Terms & Conditions (QM-WP03C) was folded into this same
// workspace per Product Review — one workspace, one status, no separate
// nav tab.

import { ProposalWorkspaceStatus } from '@/modules/cat/quotation/domain/quotation-types';
import { formatCurrency } from '@/modules/cat/quotation/domain/proposal-pricing-types';

// Reuses the same payment method vocabulary already established in the
// Inventory vendor-billing module, for consistency across the app.
export type CommercialPaymentMethod = 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'ONLINE';

export const PAYMENT_METHOD_LABELS: Record<CommercialPaymentMethod, string> = {
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  CASH: 'Cash',
  ONLINE: 'Online Payment',
};

export type AdvanceType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export const ADVANCE_TYPE_LABELS: Record<AdvanceType, string> = {
  PERCENTAGE: 'Percentage of Total',
  FIXED_AMOUNT: 'Fixed Amount',
};

// Single source of truth for rendering an Advance Value. A Percentage
// advance (e.g. 33) must always read "33%", never be run through currency
// formatting — every place that displays Advance Value (Snapshot Viewer,
// Printable Proposal Layout, Revision Comparison, and any future one)
// must call this rather than reimplementing the branch.
export function formatAdvanceValue(advanceType: string | undefined, advanceValue: number | undefined): string {
  if (advanceValue === undefined || advanceValue === null) return '';
  return advanceType === 'PERCENTAGE' ? `${advanceValue}%` : formatCurrency(advanceValue);
}

export interface CommercialTermsContent {
  validUntil?: string;
  validityNotes?: string;
  paymentMethod?: CommercialPaymentMethod;
  advanceRequired?: boolean;
  advanceType?: AdvanceType;
  advanceValue?: number;
  balancePayment?: string;
  commercialNotes?: string;
  currencyCode: string;
  termsAndConditions?: string;
  commercialTermsStatus: ProposalWorkspaceStatus;
}

// QM-WP03C — application-level default. Copied into a Quotation's own
// terms_and_conditions column the first time its Commercial Terms Workspace
// is fetched with that field still empty; the quotation owns its own copy
// from that point on (editing it never touches this constant).
export const DEFAULT_TERMS_AND_CONDITIONS = `1. Confirmation & Payment
This proposal is confirmed only upon receipt of the advance payment specified in the Payment Terms section. Confirmed bookings are subject to the pricing and terms stated in this proposal at the time of confirmation.

2. Cancellation Policy
Cancellations must be submitted in writing. Advance payments are non-refundable once services have been confirmed and preparations have begun. Cancellations made closer to the event date may be subject to additional charges to cover costs already incurred.

3. Guest Count Changes
Final guest count must be confirmed as agreed in advance of the event. Increases in guest count are subject to availability and may affect final pricing. Decreases after the final confirmation date will not reduce the agreed charges.

4. Force Majeure
Neither party shall be held liable for delay or failure to perform obligations under this proposal due to causes beyond their reasonable control, including but not limited to natural disasters, government action, or other unforeseeable events.

5. Liability
The service provider's liability is limited to the value of the services contracted under this proposal. The service provider is not responsible for loss, damage, or injury arising from causes outside its direct control.

6. Governing Terms
This proposal is governed by the standard commercial policies of the service provider. Any proposal-specific conditions noted above take precedence over these general terms.`;
