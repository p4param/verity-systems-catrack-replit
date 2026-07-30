import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// QM-WP02B-03 — Proposal Highlights Workspace.
// ProposalHighlight is a dedicated business entity (a repeatable, reorderable
// list scoped to one Quotation, following the Collection Authoring Pattern
// established by ScopeServiceBlock in QM-WP02B-01), not a generic proposal
// engine. Save Draft persists the entire current highlight card list
// (add/edit/delete/reorder all happen client-side; this endpoint reconciles
// the full list in one explicit save).

interface ProposalHighlightInput {
  id: string;
  highlightTitle: string;
  highlightDescription: string;
  internalNotes?: string;
}

async function ensureQuotationInTenant(quotationId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id FROM cat_quotations
    WHERE id = ${quotationId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] || null;
}

async function fetchHighlights(quotationId: string, tenantId: string) {
  return prisma.$queryRaw<any[]>`
    SELECT
      id,
      quotation_id as "quotationId",
      highlight_title as "highlightTitle",
      highlight_description as "highlightDescription",
      internal_notes as "internalNotes",
      display_order as "displayOrder",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM cat_quotation_proposal_highlights
    WHERE quotation_id = ${quotationId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const quotation = await ensureQuotationInTenant(id, tenantId);
    if (!quotation) {
      return NextResponse.json({ success: false, error: 'Quotation record not found' }, { status: 404 });
    }

    const statusRows: any[] = await prisma.$queryRaw`
      SELECT proposal_highlights_status as "proposalHighlightsStatus"
      FROM cat_quotations
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
    const highlights = await fetchHighlights(id, tenantId);

    return NextResponse.json({
      success: true,
      proposalHighlightsStatus: statusRows[0]?.proposalHighlightsStatus || 'NOT_STARTED',
      highlights,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Proposal Highlights Workspace:', error);
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
    const { action, highlights } = body as {
      action?: 'SAVE' | 'MARK_READY';
      highlights?: ProposalHighlightInput[];
    };

    const quotation = await ensureQuotationInTenant(id, tenantId);
    if (!quotation) {
      return NextResponse.json({ success: false, error: 'Quotation record not found' }, { status: 404 });
    }

    if (action === 'MARK_READY') {
      // Mark Ready simply updates the Workspace Status — no validation, no
      // editing lock, no workflow, consistent with every other workspace.
      await prisma.$executeRaw`
        UPDATE cat_quotations
        SET proposal_highlights_status = 'READY', updated_at = NOW(), updated_by = ${userId}::uuid
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
    } else {
      const incoming = Array.isArray(highlights) ? highlights : [];

      for (const highlight of incoming) {
        if (!highlight.highlightTitle?.trim() || !highlight.highlightDescription?.trim()) {
          return NextResponse.json(
            { success: false, error: 'Highlight Title and Highlight Description are required for every Highlight Card.' },
            { status: 400 },
          );
        }
      }

      await prisma.$transaction(async (tx) => {
        const existingRows: Array<{ id: string }> = await tx.$queryRaw`
          SELECT id FROM cat_quotation_proposal_highlights
          WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        `;
        const incomingIds = new Set(incoming.map((h) => h.id));
        const idsToDelete = existingRows.map((r) => r.id).filter((existingId) => !incomingIds.has(existingId));

        for (const deleteId of idsToDelete) {
          await tx.$executeRaw`
            DELETE FROM cat_quotation_proposal_highlights
            WHERE id = ${deleteId}::uuid AND quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
          `;
        }

        for (let index = 0; index < incoming.length; index++) {
          const highlight = incoming[index];
          await tx.$executeRaw`
            INSERT INTO cat_quotation_proposal_highlights (
              id, tenant_id, quotation_id, highlight_title, highlight_description, internal_notes,
              display_order, created_at, created_by, updated_at, updated_by
            ) VALUES (
              ${highlight.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${highlight.highlightTitle.trim()},
              ${highlight.highlightDescription.trim()}, ${highlight.internalNotes?.trim() || null},
              ${index}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid
            )
            ON CONFLICT (id) DO UPDATE SET
              highlight_title = EXCLUDED.highlight_title,
              highlight_description = EXCLUDED.highlight_description,
              internal_notes = EXCLUDED.internal_notes,
              display_order = EXCLUDED.display_order,
              updated_at = NOW(),
              updated_by = EXCLUDED.updated_by
            WHERE cat_quotation_proposal_highlights.quotation_id = EXCLUDED.quotation_id
              AND cat_quotation_proposal_highlights.tenant_id = EXCLUDED.tenant_id
          `;
        }

        // First successful save moves the workspace from Not Started to In
        // Progress. Ready is always an explicit user decision (Mark Ready).
        await tx.$executeRaw`
          UPDATE cat_quotations
          SET
            proposal_highlights_status = CASE
              WHEN proposal_highlights_status = 'NOT_STARTED' THEN 'IN_PROGRESS'
              ELSE proposal_highlights_status
            END,
            updated_at = NOW(),
            updated_by = ${userId}::uuid
          WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        `;
      });
    }

    const statusRows: any[] = await prisma.$queryRaw`
      SELECT proposal_highlights_status as "proposalHighlightsStatus"
      FROM cat_quotations
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
    const refreshedHighlights = await fetchHighlights(id, tenantId);

    return NextResponse.json({
      success: true,
      proposalHighlightsStatus: statusRows[0]?.proposalHighlightsStatus || 'NOT_STARTED',
      highlights: refreshedHighlights,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error saving Proposal Highlights Workspace:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
