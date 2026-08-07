import { VendorStatus } from '@/modules/cat/vendor/domain/vendor-types';

// PM-WP04A — Vendor Recommendation Enhancement.
// The canonical source of truth for the recommendation decision, moved
// here from Purchase Planning (which owned it exclusively in PM-WP02)
// because it now has a second consumer: the Ingredient Workspace's
// Vendor Recommendations tab (PM-WP04B). Purchase Planning's own domain
// module re-exports these under their original names — no breaking
// change to any existing import.
//
// Status values renamed from the "Preferred" vocabulary to "Priority 1"
// — same decision tree, same meaning, vocabulary now matches the
// ordered-priority model replacing the boolean.

export type VendorRecommendationStatus =
  | 'READY'
  | 'NO_VENDOR'
  | 'NO_ACTIVE_VENDOR'
  | 'BLOCKED_PRIORITY_1_VENDOR'
  | 'INACTIVE_PRIORITY_1_VENDOR'
  | 'MULTIPLE_PRIORITY_1_VENDORS';

export const VENDOR_RECOMMENDATION_STATUS_LABELS: Record<VendorRecommendationStatus, string> = {
  READY: 'Ready',
  NO_VENDOR: 'No Vendor',
  NO_ACTIVE_VENDOR: 'No Active Vendor',
  BLOCKED_PRIORITY_1_VENDOR: 'Blocked Priority 1 Vendor',
  INACTIVE_PRIORITY_1_VENDOR: 'Inactive Priority 1 Vendor',
  MULTIPLE_PRIORITY_1_VENDORS: 'Multiple Priority 1 Vendors',
};

export type RecommendationConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface VendorLinkRow {
  ingredientId: string;
  vendorId: string;
  vendorName: string;
  status: VendorStatus;
  businessCategory: string | null;
  priority: number | null;
}

// Shown only for BLOCKED_PRIORITY_1_VENDOR / INACTIVE_PRIORITY_1_VENDOR
// — the lowest-numbered ACTIVE Vendor ranked below the unavailable
// Priority 1. Never auto-selected: a human must consciously choose it
// (PM-WP04 Engineering Package §6/§8).
export interface SuggestedAlternative {
  vendorId: string;
  vendorName: string;
  priority: number;
}

export interface VendorRecommendation {
  status: VendorRecommendationStatus;
  reason: string;
  confidence: RecommendationConfidence;
  vendorId: string | null;
  vendorName: string | null;
  suggestedAlternative: SuggestedAlternative | null;
}

// PM-WP04 §4 — a coarser, triaged read of the same signals the
// recommendation decision already produces, plus one independent check
// (Priority Gaps) the recommendation decision itself has no reason to
// care about. Computed only, never persisted.
export type RecommendationHealthTier = 'HEALTHY' | 'WARNING' | 'CRITICAL';

export interface RecommendationHealth {
  tier: RecommendationHealthTier;
  reasons: string[];
}
