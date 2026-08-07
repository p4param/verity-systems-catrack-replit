import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/permission-guard';
import { removeVendorFromRanking } from '@/modules/cat/vendor-recommendation/domain/vendor-recommendation-operations';

// PM-WP04A — Remove From Ranking: clears this Vendor's Priority back to
// No Recommendation and closes the gap for everyone still ranked. The
// Vendor-Ingredient link itself is untouched — it still appears in
// Supply Portfolio and can be re-ranked later. No request body.

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_INGREDIENT_MASTER_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id, vendorId } = params;

    const result = await removeVendorFromRanking(tenantId, userId, id, vendorId);
    if (!result.ok) {
      const { status, error } = result;
      return NextResponse.json({ success: false, error }, { status });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error removing Vendor from ranking:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
