import { ProductionCenterOverallRow } from '@/modules/cat/production-center/domain/production-center-types';
import { matchVendorLinks, recommendVendor } from '@/modules/cat/vendor-recommendation/domain/vendor-recommendation-engine';
import { PurchasePlanningDashboard, PurchasePlanningRow, VendorMatchOption } from '@/modules/cat/purchase-planning/domain/purchase-planning-types';

// PM-WP02 — Purchase Planning recommendation engine.
// PM-WP04A — the matching query and the decision tree themselves moved
// to the shared vendor-recommendation module (now also consumed by the
// Ingredient Workspace); this file is the Purchase-Planning-specific
// orchestration layer only — mapping the shared engine's output onto
// Production Center's overall[] rows and computing this screen's own
// dashboard KPIs. Same extraction discipline as getProductionCenterData
// in PM-WP02/03: reuse the real function, never re-derive its logic.

export async function computePurchasePlan(
  tenantId: string,
  overall: ProductionCenterOverallRow[],
): Promise<{ rows: PurchasePlanningRow[]; dashboard: PurchasePlanningDashboard }> {
  const ingredientIds = [...new Set(overall.map((r) => r.ingredientId))];
  const vendorsByIngredient = await matchVendorLinks(tenantId, ingredientIds);

  const rows: PurchasePlanningRow[] = overall.map((item) => {
    const links = vendorsByIngredient.get(item.ingredientId) || [];
    const rec = recommendVendor(links);
    const vendorsAvailable: VendorMatchOption[] = links.map((l) => ({
      vendorId: l.vendorId,
      vendorName: l.vendorName,
      priority: l.priority,
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
      suggestedAlternative: rec.suggestedAlternative,
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
