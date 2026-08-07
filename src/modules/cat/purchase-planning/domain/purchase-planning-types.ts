import { VendorStatus } from '@/modules/cat/vendor/domain/vendor-types';
import {
  RecommendationConfidence,
  SuggestedAlternative,
  VendorRecommendationStatus,
  VENDOR_RECOMMENDATION_STATUS_LABELS,
} from '@/modules/cat/vendor-recommendation/domain/vendor-recommendation-types';

// PM-WP02 — Purchase Planning. Read-only recommendation layer: for every
// ingredient in Production Center's Consolidated Ingredient Demand on a
// Work Date, recommend which Vendor (from Vendor Master's Supply
// Portfolio) should supply it. Nothing here is persisted — every field is
// recomputed on every request from cat_vendor_ingredients + cat_vendors,
// the same way Production Center itself recomputes from Events. No
// pricing, no Purchase Orders, no Inventory — see PM-WP02 Engineering
// Package for full out-of-scope list.

// PM-WP04A — the recommendation decision itself (status, confidence,
// SuggestedAlternative) now lives in the shared vendor-recommendation
// module, since it has a second consumer besides Purchase Planning (the
// Ingredient Workspace's Vendor Recommendations tab, PM-WP04B). Re-
// exported here under their original names — no breaking change to any
// existing import of this file.
export type PurchasePlanningStatus = VendorRecommendationStatus;
export const PURCHASE_PLANNING_STATUS_LABELS = VENDOR_RECOMMENDATION_STATUS_LABELS;
export type { RecommendationConfidence, SuggestedAlternative };

export interface VendorMatchOption {
  vendorId: string;
  vendorName: string;
  priority: number | null;
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
  // PM-WP04A — populated only for BLOCKED_PRIORITY_1_VENDOR /
  // INACTIVE_PRIORITY_1_VENDOR. Informational only — never auto-applied.
  suggestedAlternative: SuggestedAlternative | null;
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
