import { prisma } from '@/lib/prisma';
import {
  RecommendationHealth,
  SuggestedAlternative,
  VendorLinkRow,
  VendorRecommendation,
} from '@/modules/cat/vendor-recommendation/domain/vendor-recommendation-types';

// PM-WP04A — Vendor Recommendation Enhancement.
// Vendor matching is by ingredientId only — cat_vendor_ingredients has
// no per-unit supply concept (unchanged invariant from PM-WP02).

export async function matchVendorLinks(tenantId: string, ingredientIds: string[]): Promise<Map<string, VendorLinkRow[]>> {
  const map = new Map<string, VendorLinkRow[]>();
  if (ingredientIds.length === 0) return map;

  const rows: VendorLinkRow[] = await prisma.$queryRaw`
    SELECT
      vi.ingredient_id as "ingredientId", v.id as "vendorId", v.name as "vendorName",
      v.status, v.business_category as "businessCategory", vi.priority
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

function computeSuggestedAlternative(links: VendorLinkRow[]): SuggestedAlternative | null {
  const rankedActive = links
    .filter((l) => l.priority !== null && l.priority > 1 && l.status === 'ACTIVE')
    .sort((a, b) => (a.priority as number) - (b.priority as number));
  if (rankedActive.length === 0) return null;
  const v = rankedActive[0];
  return { vendorId: v.vendorId, vendorName: v.vendorName, priority: v.priority as number };
}

// The decision tree from the PM-WP02 Engineering Package, re-expressed
// in Priority terms per PM-WP04 — same strict priority order, first
// match wins, never silently guesses. A Blocked/Inactive Priority-1
// Vendor is still surfaced even when an active alternative exists (the
// alternative is offered as a SuggestedAlternative, never auto-applied)
// — the business explicitly configured a preference that needs a
// human's attention, not a silent substitution.
export function recommendVendor(links: VendorLinkRow[]): VendorRecommendation {
  if (links.length === 0) {
    return { status: 'NO_VENDOR', reason: 'Vendor not configured.', confidence: 'NONE', vendorId: null, vendorName: null, suggestedAlternative: null };
  }

  const priorityOneActive = links.filter((l) => l.priority === 1 && l.status === 'ACTIVE');
  if (priorityOneActive.length === 1) {
    const v = priorityOneActive[0];
    return { status: 'READY', reason: 'Priority 1 Vendor', confidence: 'HIGH', vendorId: v.vendorId, vendorName: v.vendorName, suggestedAlternative: null };
  }
  if (priorityOneActive.length > 1) {
    return {
      status: 'MULTIPLE_PRIORITY_1_VENDORS',
      reason: 'Multiple Priority 1 vendors configured — choose manually.',
      confidence: 'NONE',
      vendorId: null,
      vendorName: null,
      suggestedAlternative: null,
    };
  }

  // Blocked takes priority over Inactive if a Priority-1 Vendor link of
  // both kinds somehow exists (rare double-edge case, only reachable
  // via legacy/direct-manipulated data — see the migration's own note
  // on why no DB constraint prevents this) since Blocked is the harder
  // stop.
  const priorityOneBlocked = links.filter((l) => l.priority === 1 && l.status === 'BLOCKED');
  if (priorityOneBlocked.length >= 1) {
    return {
      status: 'BLOCKED_PRIORITY_1_VENDOR',
      reason: 'Priority 1 vendor is blocked.',
      confidence: 'NONE',
      vendorId: null,
      vendorName: null,
      suggestedAlternative: computeSuggestedAlternative(links),
    };
  }
  const priorityOneInactive = links.filter((l) => l.priority === 1 && l.status === 'INACTIVE');
  if (priorityOneInactive.length >= 1) {
    return {
      status: 'INACTIVE_PRIORITY_1_VENDOR',
      reason: 'Priority 1 vendor is inactive.',
      confidence: 'NONE',
      vendorId: null,
      vendorName: null,
      suggestedAlternative: computeSuggestedAlternative(links),
    };
  }

  const activeAny = links.filter((l) => l.status === 'ACTIVE');
  if (activeAny.length >= 1) {
    const v = activeAny[0]; // links are already ordered by v.name ASC from SQL — deterministic alphabetical tie-break
    const confidence = activeAny.length === 1 ? 'MEDIUM' : 'LOW';
    return { status: 'READY', reason: 'No Priority 1 vendor configured.', confidence, vendorId: v.vendorId, vendorName: v.vendorName, suggestedAlternative: null };
  }

  return { status: 'NO_ACTIVE_VENDOR', reason: 'No active supplier.', confidence: 'NONE', vendorId: null, vendorName: null, suggestedAlternative: null };
}

// Contiguous-from-1 check over the ranked subset only — unranked
// (No Recommendation) links never participate. Independent of
// recommendVendor: a gap doesn't change who gets recommended (a
// Priority-1 Vendor works fine even if Priority 3 is missing), so the
// recommendation decision itself has no reason to look for one — this
// exists purely for Recommendation Health.
function hasPriorityGap(links: VendorLinkRow[]): boolean {
  const ranked = links
    .filter((l) => l.priority !== null)
    .map((l) => l.priority as number)
    .sort((a, b) => a - b);
  for (let i = 0; i < ranked.length; i++) {
    if (ranked[i] !== i + 1) return true;
  }
  return false;
}

// PM-WP04 §4 — tiered by how much work resolving the issue takes, not
// by whether Purchase Planning can currently show a recommendation
// (several genuinely different situations all answer "no" to that).
// Critical: no viable Vendor without real sourcing/investigation work.
// Warning: either a fix is one click away (a SuggestedAlternative
// exists), the ingredient is still procurable today just without an
// explicit top choice, or it's a purely cosmetic ranking gap.
// Reuses recommendVendor's own output rather than re-deriving anything.
export function computeRecommendationHealth(links: VendorLinkRow[]): RecommendationHealth {
  const rec = recommendVendor(links);
  const criticalReasons: string[] = [];
  if (rec.status === 'NO_VENDOR') criticalReasons.push('No Vendor configured.');
  if (rec.status === 'NO_ACTIVE_VENDOR') criticalReasons.push('No Active Vendor.');
  if (rec.status === 'MULTIPLE_PRIORITY_1_VENDORS') criticalReasons.push('Multiple Priority 1 Vendors configured.');
  if (criticalReasons.length > 0) return { tier: 'CRITICAL', reasons: criticalReasons };

  const warningReasons: string[] = [];
  if (rec.status === 'BLOCKED_PRIORITY_1_VENDOR') warningReasons.push('Priority 1 Vendor is Blocked.');
  if (rec.status === 'INACTIVE_PRIORITY_1_VENDOR') warningReasons.push('Priority 1 Vendor is Inactive.');
  if (rec.status === 'READY' && rec.confidence !== 'HIGH') warningReasons.push('No Priority 1 Vendor configured.');
  if (hasPriorityGap(links)) warningReasons.push('Priority ranking has a gap.');
  if (warningReasons.length > 0) return { tier: 'WARNING', reasons: warningReasons };

  return { tier: 'HEALTHY', reasons: [] };
}
