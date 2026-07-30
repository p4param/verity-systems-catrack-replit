import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// QM-WP02B-02 — Proposal Narrative Workspace.
// A document-oriented workspace: Proposal Narrative (required) + Internal
// Author Notes (optional), stored directly on the Quotation entity — no
// generic document engine, no templates, no merge fields, no PDF output.
// Dedicated GET + PATCH endpoints, same convention as Scope of Services.

async function ensureQuotationInTenant(quotationId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id FROM cat_quotations
    WHERE id = ${quotationId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const rows: any[] = await prisma.$queryRaw`
      SELECT
        proposal_narrative as "proposalNarrative",
        internal_author_notes as "internalAuthorNotes",
        proposal_narrative_status as "proposalNarrativeStatus"
      FROM cat_quotations
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ success: false, error: 'Quotation record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      proposalNarrative: row.proposalNarrative,
      internalAuthorNotes: row.internalAuthorNotes,
      proposalNarrativeStatus: row.proposalNarrativeStatus || 'NOT_STARTED',
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Proposal Narrative Workspace:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const body = await req.json();
    const { action, proposalNarrative, internalAuthorNotes } = body as {
      action?: 'SAVE' | 'MARK_READY';
      proposalNarrative?: string;
      internalAuthorNotes?: string;
    };

    const quotation = await ensureQuotationInTenant(id, tenantId);
    if (!quotation) {
      return NextResponse.json({ success: false, error: 'Quotation record not found' }, { status: 404 });
    }

    let rows: any[];

    if (action === 'MARK_READY') {
      // Mark Ready simply updates the Workspace Status — no validation, no
      // editing lock, no workflow, consistent with every other workspace.
      rows = await prisma.$queryRaw`
        UPDATE cat_quotations
        SET proposal_narrative_status = 'READY', updated_at = NOW(), updated_by = ${userId}::uuid
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        RETURNING
          proposal_narrative as "proposalNarrative",
          internal_author_notes as "internalAuthorNotes",
          proposal_narrative_status as "proposalNarrativeStatus"
      `;
    } else {
      if (!proposalNarrative?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Proposal Narrative is required.' },
          { status: 400 },
        );
      }

      // Save: persists Proposal Narrative + Internal Author Notes only.
      // First successful save moves Not Started -> In Progress; Ready is
      // always an explicit user decision (Mark Ready).
      rows = await prisma.$queryRaw`
        UPDATE cat_quotations
        SET
          proposal_narrative = ${proposalNarrative.trim()},
          internal_author_notes = ${internalAuthorNotes?.trim() || null},
          proposal_narrative_status = CASE
            WHEN proposal_narrative_status = 'NOT_STARTED' THEN 'IN_PROGRESS'
            ELSE proposal_narrative_status
          END,
          updated_at = NOW(),
          updated_by = ${userId}::uuid
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        RETURNING
          proposal_narrative as "proposalNarrative",
          internal_author_notes as "internalAuthorNotes",
          proposal_narrative_status as "proposalNarrativeStatus"
      `;
    }

    return NextResponse.json({
      success: true,
      proposalNarrative: rows[0].proposalNarrative,
      internalAuthorNotes: rows[0].internalAuthorNotes,
      proposalNarrativeStatus: rows[0].proposalNarrativeStatus,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error saving Proposal Narrative Workspace:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
