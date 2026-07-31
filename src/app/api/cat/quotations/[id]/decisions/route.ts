import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { CUSTOMER_DECISION_LABELS, CustomerDecisionType } from '@/modules/cat/quotation/domain/customer-decision-types';

// QM-WP04D — Customer Decision.
// Immutable, append-only decision log. Decisions always target the Current
// Published Revision, resolved server-side from cat_quotation_publications
// — never accepted from the client — so a decision can never be recorded
// against a working draft. No PATCH/PUT/DELETE exists here or ever will:
// a new decision is recorded, never an old one edited.

const ALLOWED_DECISIONS = Object.keys(CUSTOMER_DECISION_LABELS) as CustomerDecisionType[];

async function fetchCurrentPublishedRevision(quotationId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT revision_number as "revisionNumber"
    FROM cat_quotation_publications
    WHERE quotation_id = ${quotationId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY revision_number DESC
    LIMIT 1
  `;
  return rows[0]?.revisionNumber ?? null;
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const decisions: any[] = await prisma.$queryRaw`
      SELECT
        d.id,
        d.revision_number as "revisionNumber",
        d.decision,
        d.notes,
        d.recorded_at as "recordedAt",
        d.recorded_by as "recordedById",
        u."fullName" as "recordedByName"
      FROM cat_quotation_proposal_decisions d
      LEFT JOIN users u ON u.id = d.recorded_by
      WHERE d.quotation_id = ${id}::uuid AND d.tenant_id = ${tenantId}::uuid
      ORDER BY d.recorded_at DESC
    `;

    return NextResponse.json({
      success: true,
      decisions: decisions.map((d) => ({
        id: d.id,
        revisionNumber: d.revisionNumber,
        decision: d.decision,
        notes: d.notes,
        recordedAt: d.recordedAt,
        recordedBy: d.recordedById ? { id: d.recordedById, fullName: d.recordedByName || 'Unknown' } : undefined,
      })),
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Decision History:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const body = await req.json();
    const { decision, notes } = body as { decision?: CustomerDecisionType; notes?: string };

    if (!decision || !ALLOWED_DECISIONS.includes(decision)) {
      return NextResponse.json({ success: false, error: 'A valid Customer Decision is required.' }, { status: 400 });
    }

    // Never against a working draft — the revision is always resolved from
    // the publication ledger, never accepted from the client.
    const revisionNumber = await fetchCurrentPublishedRevision(id, tenantId);
    if (revisionNumber === null) {
      return NextResponse.json(
        { success: false, error: 'This quotation has no published revision to record a decision against.' },
        { status: 400 },
      );
    }

    const rows: any[] = await prisma.$queryRaw`
      INSERT INTO cat_quotation_proposal_decisions (
        id, tenant_id, quotation_id, revision_number, decision, notes, recorded_at, recorded_by
      ) VALUES (
        gen_random_uuid(), ${tenantId}::uuid, ${id}::uuid, ${revisionNumber}, ${decision}, ${notes?.trim() || null}, NOW(), ${userId}::uuid
      )
      RETURNING id, revision_number as "revisionNumber", decision, notes, recorded_at as "recordedAt"
    `;

    return NextResponse.json({ success: true, decision: rows[0] });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error recording Customer Decision:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
