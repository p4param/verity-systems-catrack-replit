import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// PM-WP01 — Vendor Master Directory. A Vendor supplies business resources
// to the organization; this is not an Ingredient Supplier Master — the
// Directory lists Vendors by their own identity/classification, with a
// Supply Portfolio count as a lightweight cross-reference only. Mirrors
// the established CAT directory list pattern (incrementally-built raw
// SQL, no pagination, { success, items, total }), same as Ingredient
// Master (EM-WP07).

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_VENDOR_VIEW');
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const businessCategory = searchParams.get('businessCategory') || '';
    const status = searchParams.get('status') || '';
    const sort = searchParams.get('sort') || 'name_asc';

    let sql = `
      SELECT
        v.id,
        v.vendor_code as "vendorCode",
        v.name,
        v.business_category as "businessCategory",
        v.contact_person as "contactPerson",
        v.phone,
        v.city,
        v.status,
        COALESCE(vi.supply_count, 0)::int as "supplyCount",
        v.created_at as "createdAt",
        v.updated_at as "updatedAt"
      FROM cat_vendors v
      LEFT JOIN (
        SELECT vendor_id, COUNT(*)::int as supply_count FROM cat_vendor_ingredients GROUP BY vendor_id
      ) vi ON vi.vendor_id = v.id
      WHERE v.tenant_id = $1::uuid AND v.is_deleted = false
    `;
    const params: any[] = [tenantId];
    let idx = 2;

    if (query) {
      sql += ` AND (v.name ILIKE $${idx} OR v.vendor_code ILIKE $${idx} OR v.contact_person ILIKE $${idx} OR v.city ILIKE $${idx})`;
      params.push(`%${query}%`);
      idx++;
    }
    if (businessCategory) {
      sql += ` AND v.business_category = $${idx}`;
      params.push(businessCategory);
      idx++;
    }
    if (status) {
      sql += ` AND v.status = $${idx}`;
      params.push(status);
      idx++;
    }

    const SORT_COLUMNS: Record<string, string> = {
      name_asc: 'v.name ASC',
      name_desc: 'v.name DESC',
      created_desc: 'v.created_at DESC',
      updated_desc: 'v.updated_at DESC',
    };
    sql += ` ORDER BY ${SORT_COLUMNS[sort] || SORT_COLUMNS.name_asc}`;

    const items: any[] = await prisma.$queryRawUnsafe(sql, ...params);

    return NextResponse.json({ success: true, items, total: items.length });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Vendors:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_VENDOR_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;

    const body = await req.json();
    const { name, businessCategory, contactPerson, phone } = body as {
      name?: string;
      businessCategory?: string;
      contactPerson?: string;
      phone?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required.' }, { status: 400 });
    }

    // Auto-generate immutable Vendor Code: VEN-YYYY-XXXX, matching the
    // established {PREFIX}-{YEAR}-{padded sequence} convention.
    const currentYear = new Date().getFullYear();
    const countResult: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM cat_vendors WHERE tenant_id = ${tenantId}::uuid
    `;
    const seqNumber = (countResult[0]?.count || 0) + 1;
    const vendorCode = `VEN-${currentYear}-${String(seqNumber).padStart(4, '0')}`;

    const rows: any[] = await prisma.$queryRaw`
      INSERT INTO cat_vendors (
        id, tenant_id, vendor_code, name, business_category, contact_person, phone, status,
        created_at, created_by, updated_at, updated_by, is_deleted
      ) VALUES (
        gen_random_uuid(), ${tenantId}::uuid, ${vendorCode}, ${name.trim()}, ${businessCategory?.trim() || null},
        ${contactPerson?.trim() || null}, ${phone?.trim() || null}, 'ACTIVE', NOW(), ${userId}::uuid, NOW(), ${userId}::uuid, false
      )
      RETURNING id, vendor_code as "vendorCode", name
    `;

    return NextResponse.json({ success: true, item: rows[0] });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error creating Vendor:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
