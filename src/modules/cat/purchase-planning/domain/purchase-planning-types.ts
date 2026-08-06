import { VendorStatus } from '@/modules/cat/vendor/domain/vendor-types';

// PM-WP02 — Purchase Planning. Read-only recommendation layer: for every
// ingredient in Production Center's Consolidated Ingredient Demand on a
// Work Date, recommend which Vendor (from Vendor Master's Supply
// Portfolio) should supply it. Nothing here is persisted — every field is
// recomputed on every request from cat_vendor_ingredients + cat_vendors,
// the same way Production Center itself recomputes from Events. No
// pricing, no Purchase Orders, no Inventory — see PM-WP02 Engineering
// Package for full out-of-scope list.

// Product Review refinement: Blocked and Inactive preferred vendors are
// kept as distinct statuses (not merged) so the grid badge itself is
// accurate, not just the expanded-panel reason text.
export type PurchasePlanningStatus =
  | 'READY'
  | 'NO_VENDOR'
  | 'NO_ACTIVE_VENDOR'
  | 'BLOCKED_PREFERRED_VENDOR'
  | 'INACTIVE_PREFERRED_VENDOR'
  | 'MULTIPLE_PREFERRED_VENDORS';

export const PURCHASE_PLANNING_STATUS_LABELS: Record<PurchasePlanningStatus, string> = {
  READY: 'Ready',
  NO_VENDOR: 'No Vendor',
  NO_ACTIVE_VENDOR: 'No Active Vendor',
  BLOCKED_PREFERRED_VENDOR: 'Blocked Preferred Vendor',
  INACTIVE_PREFERRED_VENDOR: 'Inactive Preferred Vendor',
  MULTIPLE_PREFERRED_VENDORS: 'Multiple Preferred Vendors',
};

// Product Review refinement: a lightweight, non-persistent computed
// signal for how much to trust the recommendation — not essential to
// PM-WP02's own UI, but cheap to compute now from fields already on hand
// (status + how many active candidates existed), and intended to give
// future Procurement/Vendor Performance work a ready-made hook rather
// than retrofitting one later.
export type RecommendationConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface VendorMatchOption {
  vendorId: string;
  vendorName: string;
  isPreferred: boolean;
  status: VendorStatus;
  businessCategory?: string;
}

export interface PurchasePlanningRow {
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  requiredQuantity: number;
  unit: string;
  vendorsAvailable: VendorMatchOption[];
  recommendedVendorId: string | null;
  recommendedVendorName: string | null;
  reason: string;
  status: PurchasePlanningStatus;
  confidence: RecommendationConfidence;
}

export interface PurchasePlanningDashboard {
  ingredients: number;
  // Product Review refinement: renamed from "Vendor Matches" — count of
  // rows with at least one linked Vendor, regardless of recommendation
  // outcome.
  vendorCoverage: number;
  ready: number;
  warnings: number;
}

export interface PurchasePlanningResponse {
  success: boolean;
  workDate: string;
  dashboard: PurchasePlanningDashboard;
  rows: PurchasePlanningRow[];
}
