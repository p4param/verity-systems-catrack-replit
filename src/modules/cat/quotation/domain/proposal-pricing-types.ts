// QM-WP03A — Commercial Pricing Workspace.
// ProposalCharge, ProposalDiscount, and ProposalAdjustment are three
// dedicated business entities — each a repeatable, reorderable list
// belonging to a single Quotation, following the Collection Authoring
// Pattern established by ScopeServiceBlock (QM-WP02B-01). Not a generic
// pricing-line abstraction — specific to Commercial Pricing only.

export interface ProposalCharge {
  id: string;
  quotationId: string;
  description: string;
  amount: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalChargeInput {
  id: string;
  description: string;
  amount: number;
}

export interface ProposalDiscount {
  id: string;
  quotationId: string;
  description: string;
  amount: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalDiscountInput {
  id: string;
  description: string;
  amount: number;
}

export interface ProposalAdjustment {
  id: string;
  quotationId: string;
  description: string;
  amount: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalAdjustmentInput {
  id: string;
  description: string;
  amount: number;
}

// GST rate: fixed at 18%, matching the default already used elsewhere in
// this codebase (Events wizard commercial step, `gstPct || 18`). QM-WP03A's
// engineering package does not define a configurable rate or where one
// would come from, so this is treated as the same fixed default — flagged
// for Product Review confirmation.
export const GST_RATE_PERCENT = 18;

export interface PricingSummary {
  chargesTotal: number;
  discountTotal: number;
  adjustmentTotal: number;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
}

export function computePricingSummary(
  charges: Array<{ amount: number }>,
  discounts: Array<{ amount: number }>,
  adjustments: Array<{ amount: number }>,
): PricingSummary {
  const chargesTotal = charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const discountTotal = discounts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const adjustmentTotal = adjustments.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const subtotal = chargesTotal - discountTotal + adjustmentTotal;
  const gstAmount = subtotal * (GST_RATE_PERCENT / 100);
  const grandTotal = subtotal + gstAmount;

  return { chargesTotal, discountTotal, adjustmentTotal, subtotal, gstAmount, grandTotal };
}

// Application's standard currency formatter (matches the convention used
// elsewhere in this codebase, e.g. Budget & Commercial Discovery). Shared
// here since it's now needed by both Commercial Pricing and Proposal Review.
const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return CURRENCY_FORMATTER.format(value);
}
