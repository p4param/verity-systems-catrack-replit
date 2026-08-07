import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/permission-guard';
import { moveVendorPriority } from '@/modules/cat/vendor-recommendation/domain/vendor-recommendation-operations';

// PM-WP04A — Move Down: swaps this Vendor's Priority with whoever holds
// the adjacent (numerically higher) rank. No request body.

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_INGREDIENT_MASTER_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id, vendorId } = params;

    const result = await moveVendorPriority(tenantId, userId, id, vendorId, 'down');
    if (!result.ok) {
      const { status, error } = result;
      return NextResponse.json({ success: false, error }, { status });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error moving Vendor Priority down:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
