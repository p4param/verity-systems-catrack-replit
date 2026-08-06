// PM-WP01 — Vendor Master. A Vendor supplies business resources to the
// organization; this is deliberately NOT an Ingredient Supplier Master.
// cat_vendors carries only identity, classification, contact, and
// commercial-terms fields — no pricing, rate cards, or resource-specific
// data. What a Vendor supplies lives in vendor-supply-portfolio-types.ts.

export type VendorStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  BLOCKED: 'Blocked',
};

// Free-text, curated by convention (matches ingredientType/procurementCategory
// on Ingredient Master) rather than a DB enum — new categories don't need a
// migration. Suggested starting set, not exhaustive.
export const VENDOR_BUSINESS_CATEGORY_SUGGESTIONS = [
  'Food Supplier',
  'Equipment Rental',
  'Packaging',
  'Transport',
  'Cleaning',
  'Utility',
];

export interface VendorSummary {
  id: string;
  vendorCode: string;
  name: string;
  businessCategory?: string;
  contactPerson?: string;
  phone?: string;
  city?: string;
  status: VendorStatus;
  supplyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VendorDetail {
  id: string;
  vendorCode: string;
  name: string;
  businessCategory?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  taxId?: string;
  paymentTerms?: string;
  status: VendorStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
