import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/permission-guard';
import { makeVendorPrimary } from '@/modules/cat/vendor-recommendation/domain/vendor-recommendation-operations';

// PM-WP04A — Make Primary: jumps a Vendor straight to Priority 1 from
// any state, cascading everyone else currently ranked down by one.
// Reserved for the exceptional case — Add To Ranking is the ordinary
// path for a newly-linked Vendor. No request body.

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_INGREDIENT_MASTER_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id, vendorId } = params;

    const result = await makeVendorPrimary(tenantId, userId, id, vendorId);
    if (!result.ok) {
      const { status, error } = result;
      return NextResponse.json({ success: false, error }, { status });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error making Vendor Primary:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
