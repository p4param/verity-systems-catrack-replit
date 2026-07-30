import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

async function ensureInquiryInTenant(inquiryId: string, tenantId: string) {
  const rows: Array<{ id: string; title: string }> = await prisma.$queryRaw`
    SELECT id, title
    FROM cat_inquiries
    WHERE id = ${inquiryId}::uuid
      AND tenant_id = ${tenantId}::uuid
      AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_VIEW');
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const status = searchParams.get('status') || '';
    const relationshipId = searchParams.get('relationshipId') || '';
    const inquiryId = searchParams.get('inquiryId') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const sort = searchParams.get('sort') || 'created_desc';

    let sql = `
      SELECT
        q.id,
        q.quotation_number as "quotationNumber",
        q.title,
        q.purpose,
        q.status,
        q.inquiry_id as "inquiryId",
        i.inquiry_number as "inquiryNumber",
        i.title as "inquiryTitle",
        i.relationship_id as "relationshipId",
        r.name as "relationshipName",
        COALESCE(rev.revision_number, 0) as "currentRevisionNumber",
        q.created_at as "createdAt",
        q.updated_at as "updatedAt"
      FROM cat_quotations q
      JOIN cat_inquiries i ON q.inquiry_id = i.id
      LEFT JOIN cat_relationships r ON i.relationship_id = r.id
      LEFT JOIN cat_quotation_revisions rev ON rev.quotation_id = q.id AND rev.is_current = true
      WHERE q.tenant_id = $1::uuid AND q.is_deleted = false
    `;

    const params: any[] = [tenantId];
    let idx = 2;

    if (query) {
      sql += ` AND (q.title ILIKE $${idx} OR q.quotation_number ILIKE $${idx} OR r.name ILIKE $${idx} OR i.inquiry_number ILIKE $${idx})`;
      params.push(`%${query}%`);
      idx++;
    }

    if (status) {
      sql += ` AND q.status = $${idx}`;
      params.push(status);
      idx++;
    }

    if (relationshipId) {
      sql += ` AND i.relationship_id = $${idx}::uuid`;
      params.push(relationshipId);
      idx++;
    }

    if (inquiryId) {
      sql += ` AND q.inquiry_id = $${idx}::uuid`;
      params.push(inquiryId);
      idx++;
    }

    if (dateFrom) {
      sql += ` AND q.created_at >= $${idx}::timestamptz`;
      params.push(new Date(dateFrom));
      idx++;
    }

    if (dateTo) {
      sql += ` AND q.created_at <= $${idx}::timestamptz`;
      params.push(new Date(dateTo));
      idx++;
    }

    const SORT_COLUMNS: Record<string, string> = {
      created_desc: 'q.created_at DESC',
      created_asc: 'q.created_at ASC',
      title_asc: 'q.title ASC',
      updated_desc: 'q.updated_at DESC',
    };
    sql += ` ORDER BY ${SORT_COLUMNS[sort] || SORT_COLUMNS.created_desc}`;

    const quotations: any[] = await prisma.$queryRawUnsafe(sql, ...params);

    return NextResponse.json({
      success: true,
      items: quotations,
      total: quotations.length,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching quotations:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_CREATE');
    const tenantId = user.tenantId;
    const userId = user.id;

    const body = await req.json();
    const { inquiryId, title, purpose, description } = body as {
      inquiryId?: string;
      title?: string;
      purpose?: string;
      description?: string;
    };

    if (!inquiryId || !title || !purpose) {
      return NextResponse.json(
        { success: false, error: 'Inquiry, Title, and Purpose are required.' },
        { status: 400 },
      );
    }

    const inquiry = await ensureInquiryInTenant(inquiryId, tenantId);
    if (!inquiry) {
      return NextResponse.json({ success: false, error: 'Inquiry record not found' }, { status: 404 });
    }

    // Auto-generate Quotation Number: QT-YYYY-000000
    const currentYear = new Date().getFullYear();
    const countResult: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM cat_quotations WHERE tenant_id = ${tenantId}::uuid
    `;
    const seqNumber = (countResult[0]?.count || 0) + 1;
    const quotationNumber = `QT-${currentYear}-${String(seqNumber).padStart(6, '0')}`;

    const newId = crypto.randomUUID();
    const revisionId = crypto.randomUUID();
    const now = new Date();

    const [insertedQuotation] = await prisma.$transaction(async (tx) => {
      const quotationRows: any[] = await tx.$queryRaw`
        INSERT INTO cat_quotations (
          id, tenant_id, quotation_number, inquiry_id, title, purpose, description,
          status, created_at, created_by, updated_at, updated_by, is_deleted
        ) VALUES (
          ${newId}::uuid, ${tenantId}::uuid, ${quotationNumber}, ${inquiryId}::uuid,
          ${title}, ${purpose}, ${description || null},
          'DRAFT', ${now}, ${userId}::uuid, ${now}, ${userId}::uuid, false
        ) RETURNING id, quotation_number as "quotationNumber", title, purpose, status
      `;

      // Revision 0 is created automatically whenever a Quotation is created —
      // foundation only, no revision workflow.
      await tx.$executeRaw`
        INSERT INTO cat_quotation_revisions (
          id, tenant_id, quotation_id, revision_number, status, is_current, created_at, created_by
        ) VALUES (
          ${revisionId}::uuid, ${tenantId}::uuid, ${newId}::uuid, 0, 'DRAFT', true, ${now}, ${userId}::uuid
        )
      `;

      return quotationRows;
    });

    return NextResponse.json({
      success: true,
      quotation: insertedQuotation,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error creating quotation:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
