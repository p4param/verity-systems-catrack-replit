import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// QM-WP02B-01 — Scope of Services Workspace.
// ScopeServiceBlock is a dedicated business entity (a repeatable, reorderable
// list scoped to one Quotation), not a generic proposal-section engine.
// Save Draft persists the entire current block list (add/edit/delete/reorder
// all happen client-side; this endpoint reconciles the full list in one
// explicit save, matching the QM-WP02A Save Draft convention).

interface ScopeServiceBlockInput {
  id: string;
  blockTitle: string;
  customerDescription: string;
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

async function fetchBlocks(quotationId: string, tenantId: string) {
  return prisma.$queryRaw<any[]>`
    SELECT
      id,
      quotation_id as "quotationId",
      block_title as "blockTitle",
      customer_description as "customerDescription",
      internal_notes as "internalNotes",
      display_order as "displayOrder",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM cat_quotation_scope_service_blocks
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
      SELECT scope_of_services_status as "scopeOfServicesStatus"
      FROM cat_quotations
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
    const blocks = await fetchBlocks(id, tenantId);

    return NextResponse.json({
      success: true,
      scopeOfServicesStatus: statusRows[0]?.scopeOfServicesStatus || 'NOT_STARTED',
      blocks,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Scope of Services Workspace:', error);
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
    const { action, blocks } = body as {
      action?: 'SAVE' | 'MARK_READY';
      blocks?: ScopeServiceBlockInput[];
    };

    const quotation = await ensureQuotationInTenant(id, tenantId);
    if (!quotation) {
      return NextResponse.json({ success: false, error: 'Quotation record not found' }, { status: 404 });
    }

    if (action === 'MARK_READY') {
      // Mark Ready simply updates the Workspace Status — no validation, no
      // editing lock, no workflow, consistent with Executive Summary.
      await prisma.$executeRaw`
        UPDATE cat_quotations
        SET scope_of_services_status = 'READY', updated_at = NOW(), updated_by = ${userId}::uuid
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
    } else {
      const incoming = Array.isArray(blocks) ? blocks : [];

      for (const block of incoming) {
        if (!block.blockTitle?.trim() || !block.customerDescription?.trim()) {
          return NextResponse.json(
            { success: false, error: 'Block Title and Customer Description are required for every Service Block.' },
            { status: 400 },
          );
        }
      }

      await prisma.$transaction(async (tx) => {
        const existingRows: Array<{ id: string }> = await tx.$queryRaw`
          SELECT id FROM cat_quotation_scope_service_blocks
          WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        `;
        const incomingIds = new Set(incoming.map((b) => b.id));
        const idsToDelete = existingRows.map((r) => r.id).filter((existingId) => !incomingIds.has(existingId));

        for (const deleteId of idsToDelete) {
          await tx.$executeRaw`
            DELETE FROM cat_quotation_scope_service_blocks
            WHERE id = ${deleteId}::uuid AND quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
          `;
        }

        for (let index = 0; index < incoming.length; index++) {
          const block = incoming[index];
          await tx.$executeRaw`
            INSERT INTO cat_quotation_scope_service_blocks (
              id, tenant_id, quotation_id, block_title, customer_description, internal_notes,
              display_order, created_at, created_by, updated_at, updated_by
            ) VALUES (
              ${block.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${block.blockTitle.trim()},
              ${block.customerDescription.trim()}, ${block.internalNotes?.trim() || null},
              ${index}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid
            )
            ON CONFLICT (id) DO UPDATE SET
              block_title = EXCLUDED.block_title,
              customer_description = EXCLUDED.customer_description,
              internal_notes = EXCLUDED.internal_notes,
              display_order = EXCLUDED.display_order,
              updated_at = NOW(),
              updated_by = EXCLUDED.updated_by
            WHERE cat_quotation_scope_service_blocks.quotation_id = EXCLUDED.quotation_id
              AND cat_quotation_scope_service_blocks.tenant_id = EXCLUDED.tenant_id
          `;
        }

        // First successful save moves the workspace from Not Started to In
        // Progress. Ready is always an explicit user decision (Mark Ready).
        await tx.$executeRaw`
          UPDATE cat_quotations
          SET
            scope_of_services_status = CASE
              WHEN scope_of_services_status = 'NOT_STARTED' THEN 'IN_PROGRESS'
              ELSE scope_of_services_status
            END,
            updated_at = NOW(),
            updated_by = ${userId}::uuid
          WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        `;
      });
    }

    const statusRows: any[] = await prisma.$queryRaw`
      SELECT scope_of_services_status as "scopeOfServicesStatus"
      FROM cat_quotations
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
    const refreshedBlocks = await fetchBlocks(id, tenantId);

    return NextResponse.json({
      success: true,
      scopeOfServicesStatus: statusRows[0]?.scopeOfServicesStatus || 'NOT_STARTED',
      blocks: refreshedBlocks,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error saving Scope of Services Workspace:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
