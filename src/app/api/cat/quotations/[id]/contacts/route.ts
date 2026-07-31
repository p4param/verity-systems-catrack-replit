import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// QM-WP04B — Customer Delivery: Recipient Selection.
// Read-only list of the Quotation's linked Relationship's contacts
// (cat_quotations -> cat_inquiries.relationship_id -> cat_contacts), for
// picking Customer Delivery recipients. No new contact model — reuses the
// existing Relationship Contact entity as-is.

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const contacts: any[] = await prisma.$queryRaw`
      SELECT
        c.id,
        c.name,
        c.email,
        c.role,
        c.is_primary as "isPrimary"
      FROM cat_quotations q
      JOIN cat_inquiries i ON i.id = q.inquiry_id
      JOIN cat_contacts c ON c.relationship_id = i.relationship_id
      WHERE q.id = ${id}::uuid
        AND q.tenant_id = ${tenantId}::uuid
        AND c.tenant_id = ${tenantId}::uuid
        AND c.is_deleted = false
      ORDER BY c.is_primary DESC, c.name ASC
    `;

    return NextResponse.json({ success: true, contacts });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Quotation recipient contacts:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
