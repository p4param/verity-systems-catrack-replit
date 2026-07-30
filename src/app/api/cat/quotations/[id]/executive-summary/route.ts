import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// QM-WP02A — Executive Summary Workspace save endpoint.
// Saving is performed per Proposal Workspace: this route only ever reads or
// writes Proposal Objective, Executive Notes, and Executive Summary Status.
// It never touches any other Quotation or Proposal Workspace data.

export async function PATCH(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const body = await req.json();
    const { action, proposalObjective, executiveNotes } = body as {
      action?: 'SAVE' | 'MARK_READY';
      proposalObjective?: string;
      executiveNotes?: string;
    };

    const existing: any[] = await prisma.$queryRaw`
      SELECT id FROM cat_quotations
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
      LIMIT 1
    `;
    if (!existing[0]) {
      return NextResponse.json({ success: false, error: 'Quotation record not found' }, { status: 404 });
    }

    let rows: any[];

    if (action === 'MARK_READY') {
      // Mark Ready simply updates the Workspace Status. It does not perform
      // validation, does not lock editing, and does not trigger workflow.
      rows = await prisma.$queryRaw`
        UPDATE cat_quotations
        SET
          executive_summary_status = 'READY',
          updated_at = NOW(),
          updated_by = ${userId}::uuid
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        RETURNING
          proposal_objective as "proposalObjective",
          executive_notes as "executiveNotes",
          executive_summary_status as "executiveSummaryStatus"
      `;
    } else {
      // Save: persists Proposal Objective + Executive Notes only. The
      // workspace status is a user decision (Mark Ready) — the only
      // automatic transition is the initial Not Started -> In Progress on
      // first successful save.
      rows = await prisma.$queryRaw`
        UPDATE cat_quotations
        SET
          proposal_objective = ${proposalObjective ?? null},
          executive_notes = ${executiveNotes ?? null},
          executive_summary_status = CASE
            WHEN executive_summary_status = 'NOT_STARTED' THEN 'IN_PROGRESS'
            ELSE executive_summary_status
          END,
          updated_at = NOW(),
          updated_by = ${userId}::uuid
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        RETURNING
          proposal_objective as "proposalObjective",
          executive_notes as "executiveNotes",
          executive_summary_status as "executiveSummaryStatus"
      `;
    }

    return NextResponse.json({ success: true, executiveSummary: rows[0] });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error saving Executive Summary Workspace:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
