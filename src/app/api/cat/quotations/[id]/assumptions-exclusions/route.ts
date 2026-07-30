import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// QM-WP02B-04 — Assumptions & Exclusions Workspace.
// ProposalAssumption and ProposalExclusion are two dedicated business
// entities (each a repeatable, reorderable list scoped to one Quotation,
// following the Collection Authoring Pattern from QM-WP02B-01), not a
// generic list-item abstraction. Save Draft reconciles both collections in
// a single explicit request; both share one workspace status.

interface StatementInput {
  id: string;
  statement: string;
}

// Table names are fixed literals from this file only — never derived from
// request input — so interpolating them into $queryRawUnsafe is safe.
const ASSUMPTIONS_TABLE = 'cat_quotation_proposal_assumptions';
const EXCLUSIONS_TABLE = 'cat_quotation_proposal_exclusions';

async function ensureQuotationInTenant(quotationId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id FROM cat_quotations
    WHERE id = ${quotationId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] || null;
}

async function fetchCollection(tableName: string, quotationId: string, tenantId: string) {
  return prisma.$queryRawUnsafe<any[]>(
    `SELECT
       id,
       quotation_id as "quotationId",
       statement,
       display_order as "displayOrder",
       created_at as "createdAt",
       updated_at as "updatedAt"
     FROM ${tableName}
     WHERE quotation_id = $1::uuid AND tenant_id = $2::uuid
     ORDER BY display_order ASC`,
    quotationId,
    tenantId,
  );
}

async function reconcileCollection(
  tx: any,
  tableName: string,
  quotationId: string,
  tenantId: string,
  userId: string,
  items: StatementInput[],
) {
  const existingRows: Array<{ id: string }> = await tx.$queryRawUnsafe(
    `SELECT id FROM ${tableName} WHERE quotation_id = $1::uuid AND tenant_id = $2::uuid`,
    quotationId,
    tenantId,
  );
  const incomingIds = new Set(items.map((item) => item.id));
  const idsToDelete = existingRows.map((r) => r.id).filter((existingId) => !incomingIds.has(existingId));

  for (const deleteId of idsToDelete) {
    await tx.$executeRawUnsafe(
      `DELETE FROM ${tableName} WHERE id = $1::uuid AND quotation_id = $2::uuid AND tenant_id = $3::uuid`,
      deleteId,
      quotationId,
      tenantId,
    );
  }

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    await tx.$executeRawUnsafe(
      `INSERT INTO ${tableName} (
         id, tenant_id, quotation_id, statement, display_order, created_at, created_by, updated_at, updated_by
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, NOW(), $6::uuid, NOW(), $6::uuid)
       ON CONFLICT (id) DO UPDATE SET
         statement = EXCLUDED.statement,
         display_order = EXCLUDED.display_order,
         updated_at = NOW(),
         updated_by = EXCLUDED.updated_by
       WHERE ${tableName}.quotation_id = EXCLUDED.quotation_id
         AND ${tableName}.tenant_id = EXCLUDED.tenant_id`,
      item.id,
      tenantId,
      quotationId,
      item.statement.trim(),
      index,
      userId,
    );
  }
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
      SELECT assumptions_exclusions_status as "assumptionsExclusionsStatus"
      FROM cat_quotations
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
    const [assumptions, exclusions] = await Promise.all([
      fetchCollection(ASSUMPTIONS_TABLE, id, tenantId),
      fetchCollection(EXCLUSIONS_TABLE, id, tenantId),
    ]);

    return NextResponse.json({
      success: true,
      assumptionsExclusionsStatus: statusRows[0]?.assumptionsExclusionsStatus || 'NOT_STARTED',
      assumptions,
      exclusions,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Assumptions & Exclusions Workspace:', error);
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
    const { action, assumptions, exclusions } = body as {
      action?: 'SAVE' | 'MARK_READY';
      assumptions?: StatementInput[];
      exclusions?: StatementInput[];
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
        SET assumptions_exclusions_status = 'READY', updated_at = NOW(), updated_by = ${userId}::uuid
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
    } else {
      const incomingAssumptions = Array.isArray(assumptions) ? assumptions : [];
      const incomingExclusions = Array.isArray(exclusions) ? exclusions : [];

      for (const item of [...incomingAssumptions, ...incomingExclusions]) {
        if (!item.statement?.trim()) {
          return NextResponse.json(
            { success: false, error: 'Every Assumption and Exclusion requires a Statement.' },
            { status: 400 },
          );
        }
      }

      await prisma.$transaction(async (tx) => {
        await reconcileCollection(tx, ASSUMPTIONS_TABLE, id, tenantId, userId, incomingAssumptions);
        await reconcileCollection(tx, EXCLUSIONS_TABLE, id, tenantId, userId, incomingExclusions);

        // First successful save moves the workspace from Not Started to In
        // Progress. Ready is always an explicit user decision (Mark Ready).
        await tx.$executeRaw`
          UPDATE cat_quotations
          SET
            assumptions_exclusions_status = CASE
              WHEN assumptions_exclusions_status = 'NOT_STARTED' THEN 'IN_PROGRESS'
              ELSE assumptions_exclusions_status
            END,
            updated_at = NOW(),
            updated_by = ${userId}::uuid
          WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        `;
      });
    }

    const statusRows: any[] = await prisma.$queryRaw`
      SELECT assumptions_exclusions_status as "assumptionsExclusionsStatus"
      FROM cat_quotations
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
    const [refreshedAssumptions, refreshedExclusions] = await Promise.all([
      fetchCollection(ASSUMPTIONS_TABLE, id, tenantId),
      fetchCollection(EXCLUSIONS_TABLE, id, tenantId),
    ]);

    return NextResponse.json({
      success: true,
      assumptionsExclusionsStatus: statusRows[0]?.assumptionsExclusionsStatus || 'NOT_STARTED',
      assumptions: refreshedAssumptions,
      exclusions: refreshedExclusions,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error saving Assumptions & Exclusions Workspace:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
