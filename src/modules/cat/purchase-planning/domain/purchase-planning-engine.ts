import { prisma } from '@/lib/prisma';
import { VendorStatus } from '@/modules/cat/vendor/domain/vendor-types';
import { ProductionCenterOverallRow } from '@/modules/cat/production-center/domain/production-center-types';
import {
  PurchasePlanningDashboard,
  PurchasePlanningRow,
  PurchasePlanningStatus,
  RecommendationConfidence,
  VendorMatchOption,
} from '@/modules/cat/purchase-planning/domain/purchase-planning-types';

// PM-WP02 — Purchase Planning recommendation engine. Vendor matching is
// by ingredientId only — cat_vendor_ingredients has no per-unit supply
// concept, so if the same ingredient appears in two units in a Work
// Date's demand (a rare, deliberate DD-001B exception), both rows share
// the same vendor match, computed once per ingredientId.

interface VendorLinkRow {
  ingredientId: string;
  vendorId: string;
  vendorName: string;
  status: VendorStatus;
  businessCategory: string | null;
  isPreferred: boolean;
}

async function matchVendors(tenantId: string, ingredientIds: string[]): Promise<Map<string, VendorLinkRow[]>> {
  const map = new Map<string, VendorLinkRow[]>();
  if (ingredientIds.length === 0) return map;

  const rows: VendorLinkRow[] = await prisma.$queryRaw`
    SELECT
      vi.ingredient_id as "ingredientId", v.id as "vendorId", v.name as "vendorName",
      v.status, v.business_category as "businessCategory", vi.is_preferred as "isPreferred"
    FROM cat_vendor_ingredients vi
    JOIN cat_vendors v ON v.id = vi.vendor_id AND v.tenant_id = ${tenantId}::uuid AND v.is_deleted = false
    WHERE vi.ingredient_id = ANY(${ingredientIds}::uuid[]) AND vi.tenant_id = ${tenantId}::uuid
    ORDER BY v.name ASC
  `;

  for (const row of rows) {
    const list = map.get(row.ingredientId);
    if (list) list.push(row);
    else map.set(row.ingredientId, [row]);
  }
  return map;
}

interface Recommendation {
  status: PurchasePlanningStatus;
  reason: string;
  confidence: RecommendationConfidence;
  vendorId: string | null;
  vendorName: string | null;
}

// The decision tree from the PM-WP02 Engineering Package, in strict
// priority order — first match wins. Never silently guesses: every
// branch carries an explainable reason, and a Blocked/Inactive preferred
// Vendor is surfaced even when an active alternative exists, because the
// business explicitly configured a preference that needs a human's
// attention, not a silent substitution.
function recommend(links: VendorLinkRow[]): Recommendation {
  if (links.length === 0) {
    return { status: 'NO_VENDOR', reason: 'Vendor not configured.', confidence: 'NONE', vendorId: null, vendorName: null };
  }

  const preferredActive = links.filter((l) => l.isPreferred && l.status === 'ACTIVE');
  if (preferredActive.length === 1) {
    const v = preferredActive[0];
    return { status: 'READY', reason: 'Preferred Vendor', confidence: 'HIGH', vendorId: v.vendorId, vendorName: v.vendorName };
  }
  if (preferredActive.length > 1) {
    return {
      status: 'MULTIPLE_PREFERRED_VENDORS',
      reason: 'Multiple preferred vendors configured — choose manually.',
      confidence: 'NONE',
      vendorId: null,
      vendorName: null,
    };
  }

  // Blocked takes priority over Inactive if a preferred Vendor link of
  // both kinds exists (rare double-edge case) since Blocked is the
  // harder stop.
  const preferredBlocked = links.filter((l) => l.isPreferred && l.status === 'BLOCKED');
  if (preferredBlocked.length >= 1) {
    return { status: 'BLOCKED_PREFERRED_VENDOR', reason: 'Preferred vendor is blocked.', confidence: 'NONE', vendorId: null, vendorName: null };
  }
  const preferredInactive = links.filter((l) => l.isPreferred && l.status === 'INACTIVE');
  if (preferredInactive.length >= 1) {
    return { status: 'INACTIVE_PREFERRED_VENDOR', reason: 'Preferred vendor is inactive.', confidence: 'NONE', vendorId: null, vendorName: null };
  }

  const activeAny = links.filter((l) => l.status === 'ACTIVE');
  if (activeAny.length >= 1) {
    const v = activeAny[0]; // links are already ordered by v.name ASC from SQL — deterministic alphabetical tie-break
    const confidence: RecommendationConfidence = activeAny.length === 1 ? 'MEDIUM' : 'LOW';
    return { status: 'READY', reason: 'No preferred vendor configured.', confidence, vendorId: v.vendorId, vendorName: v.vendorName };
  }

  return { status: 'NO_ACTIVE_VENDOR', reason: 'No active supplier.', confidence: 'NONE', vendorId: null, vendorName: null };
}

export async function computePurchasePlan(
  tenantId: string,
  overall: ProductionCenterOverallRow[],
): Promise<{ rows: PurchasePlanningRow[]; dashboard: PurchasePlanningDashboard }> {
  const ingredientIds = [...new Set(overall.map((r) => r.ingredientId))];
  const vendorsByIngredient = await matchVendors(tenantId, ingredientIds);

  const rows: PurchasePlanningRow[] = overall.map((item) => {
    const links = vendorsByIngredient.get(item.ingredientId) || [];
    const rec = recommend(links);
    const vendorsAvailable: VendorMatchOption[] = links.map((l) => ({
      vendorId: l.vendorId,
      vendorName: l.vendorName,
      isPreferred: l.isPreferred,
      status: l.status,
      businessCategory: l.businessCategory || undefined,
    }));

    return {
      ingredientId: item.ingredientId,
      ingredientCode: item.ingredientCode,
      ingredientName: item.ingredientName,
      requiredQuantity: item.quantity,
      unit: item.unit,
      vendorsAvailable,
      recommendedVendorId: rec.vendorId,
      recommendedVendorName: rec.vendorName,
      reason: rec.reason,
      status: rec.status,
      confidence: rec.confidence,
    };
  });

  const dashboard: PurchasePlanningDashboard = {
    ingredients: rows.length,
    vendorCoverage: rows.filter((r) => r.vendorsAvailable.length > 0).length,
    ready: rows.filter((r) => r.status === 'READY').length,
    warnings: rows.filter((r) => r.status !== 'READY').length,
  };

  return { rows, dashboard };
}
