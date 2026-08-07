import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/permission-guard';
import { addVendorToRanking } from '@/modules/cat/vendor-recommendation/domain/vendor-recommendation-operations';

// PM-WP04A — Add To Ranking: the ordinary way a Vendor currently in
// No Recommendation state enters the recommendation order — appended
// at the end, disturbing no one else. No request body: a pure,
// server-validated domain operation, same discipline as every lifecycle
// transition in this codebase (Purchase Order approve/issue/cancel,
// Quotation convert).

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_INGREDIENT_MASTER_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id, vendorId } = params;

    const result = await addVendorToRanking(tenantId, userId, id, vendorId);
    if (!result.ok) {
      const { status, error } = result;
      return NextResponse.json({ success: false, error }, { status });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error adding Vendor to ranking:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
