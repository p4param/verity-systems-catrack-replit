import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// PM-WP01 — Vendor Workspace, Overview tab.
// Single GET/PUT pair for one Vendor's identity, classification, contact,
// and commercial-terms fields (payment terms merged in here per Product
// Review — no separate Commercial tab yet). No versioning, editable in
// place. Supply Portfolio is a separate resource (see
// /api/cat/vendors/[id]/ingredients) — a Vendor's own fields never
// reference what it supplies.

const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'];

async function fetchVendor(id: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT
      id, vendor_code as "vendorCode", name, business_category as "businessCategory",
      contact_person as "contactPerson", phone, email, address, city, state,
      tax_id as "taxId", payment_terms as "paymentTerms", status, notes,
      created_at as "createdAt", updated_at as "updatedAt"
    FROM cat_vendors
    WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_VENDOR_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const item = await fetchVendor(id, tenantId);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Vendor:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_VENDOR_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const existing = await fetchVendor(id, tenantId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, businessCategory, contactPerson, phone, email, address, city, state, taxId, paymentTerms, status, notes } = body as {
      name?: string;
      businessCategory?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      taxId?: string;
      paymentTerms?: string;
      status?: string;
      notes?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required.' }, { status: 400 });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid Status.' }, { status: 400 });
    }

    await prisma.$executeRaw`
      UPDATE cat_vendors SET
        name = ${name.trim()},
        business_category = ${businessCategory?.trim() || null},
        contact_person = ${contactPerson?.trim() || null},
        phone = ${phone?.trim() || null},
        email = ${email?.trim() || null},
        address = ${address?.trim() || null},
        city = ${city?.trim() || null},
        state = ${state?.trim() || null},
        tax_id = ${taxId?.trim() || null},
        payment_terms = ${paymentTerms?.trim() || null},
        status = ${status || 'ACTIVE'},
        notes = ${notes?.trim() || null},
        updated_at = NOW(),
        updated_by = ${userId}::uuid
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    const updated = await fetchVendor(id, tenantId);
    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error saving Vendor:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
