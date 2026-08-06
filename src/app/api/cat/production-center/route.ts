import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/permission-guard';
import { getProductionCenterData } from '@/modules/cat/production-center/domain/get-production-center-data';

// EM-WP10A — Production Center. Read-only GET only. Consolidates EM-WP10's
// Ingredient Demand across every Event scheduled on one Work Date, via the
// shared production-demand-engine.ts — one batched query pass for however
// many Events share the date, not N calls to the single-Event endpoint.
// Do not recalculate recipes here; this only re-groups what the engine
// already computed, one level higher (Event) than EM-WP10's Meal level.
//
// PM-WP02 — the Work Date -> Events -> Ingredient Demand computation
// itself now lives in getProductionCenterData() so Purchase Planning can
// call the exact same function instead of duplicating it. This route is
// just that function plus the HTTP/permission wrapper — no behavior
// change from before the extraction.

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_EVENT_VIEW');
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);
    const workDateParam = searchParams.get('workDate');
    const workDate = workDateParam || new Date().toISOString().slice(0, 10);
    const status = searchParams.get('status') || 'ALL';

    const data = await getProductionCenterData(tenantId, workDate, status);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error computing Production Center demand:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
