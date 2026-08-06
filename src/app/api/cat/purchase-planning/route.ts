import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/permission-guard';
import { getProductionCenterData } from '@/modules/cat/production-center/domain/get-production-center-data';
import { computePurchasePlan } from '@/modules/cat/purchase-planning/domain/purchase-planning-engine';

// PM-WP02 — Purchase Planning. Read-only GET only, no writes. Consumes
// ONLY Production Center's Work Date + Consolidated Ingredient Demand
// (via the same getProductionCenterData() Production Center's own route
// calls — never re-resolves Events or re-runs the recipe engine here)
// and Vendor Master's Supply Portfolio. This is a recommendation layer,
// not Purchase Ordering — nothing computed here is persisted.

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_PURCHASE_PLANNING_VIEW');
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);
    const workDateParam = searchParams.get('workDate');
    const workDate = workDateParam || new Date().toISOString().slice(0, 10);
    const status = searchParams.get('status') || 'ALL';

    const production = await getProductionCenterData(tenantId, workDate, status);
    const { rows, dashboard } = await computePurchasePlan(tenantId, production.overall);

    return NextResponse.json({
      success: true,
      workDate,
      dashboard,
      rows,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error computing Purchase Planning:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
