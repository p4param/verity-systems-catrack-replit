import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { computePricingSummary } from '@/modules/cat/quotation/domain/proposal-pricing-types';

// QM-WP03A — Commercial Pricing Workspace.
// ProposalCharge, ProposalDiscount, and ProposalAdjustment are three
// dedicated business entities (each a repeatable, reorderable list scoped
// to one Quotation, following the Collection Authoring Pattern from
// QM-WP02B-01), not a generic pricing-line abstraction. Save Draft
// reconciles all three collections in a single explicit request; all three
// share one workspace status.

interface PricingLineInput {
  id: string;
  description: string;
  amount: number;
}

// Table names are fixed literals from this file only — never derived from
// request input — so interpolating them into $queryRawUnsafe is safe.
const CHARGES_TABLE = 'cat_quotation_proposal_charges';
const DISCOUNTS_TABLE = 'cat_quotation_proposal_discounts';
const ADJUSTMENTS_TABLE = 'cat_quotation_proposal_adjustments';

async function ensureQuotationInTenant(quotationId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id FROM cat_quotations
    WHERE id = ${quotationId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] || null;
}

async function fetchCollection(tableName: string, quotationId: string, tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT
       id,
       quotation_id as "quotationId",
       description,
       amount,
       display_order as "displayOrder",
       created_at as "createdAt",
       updated_at as "updatedAt"
     FROM ${tableName}
     WHERE quotation_id = $1::uuid AND tenant_id = $2::uuid
     ORDER BY display_order ASC`,
    quotationId,
    tenantId,
  );
  // Postgres NUMERIC comes back as a string via the driver — coerce for arithmetic.
  return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
}

async function reconcileCollection(
  tx: any,
  tableName: string,
  quotationId: string,
  tenantId: string,
  userId: string,
  items: PricingLineInput[],
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
         id, tenant_id, quotation_id, description, amount, display_order, created_at, created_by, updated_at, updated_by
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::numeric, $6, NOW(), $7::uuid, NOW(), $7::uuid)
       ON CONFLICT (id) DO UPDATE SET
         description = EXCLUDED.description,
         amount = EXCLUDED.amount,
         display_order = EXCLUDED.display_order,
         updated_at = NOW(),
         updated_by = EXCLUDED.updated_by
       WHERE ${tableName}.quotation_id = EXCLUDED.quotation_id
         AND ${tableName}.tenant_id = EXCLUDED.tenant_id`,
      item.id,
      tenantId,
      quotationId,
      item.description.trim(),
      item.amount,
      index,
      userId,
    );
  }
}

async function fetchAll(id: string, tenantId: string) {
  const [charges, discounts, adjustments] = await Promise.all([
    fetchCollection(CHARGES_TABLE, id, tenantId),
    fetchCollection(DISCOUNTS_TABLE, id, tenantId),
    fetchCollection(ADJUSTMENTS_TABLE, id, tenantId),
  ]);
  return { charges, discounts, adjustments };
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
      SELECT commercial_pricing_status as "commercialPricingStatus"
      FROM cat_quotations
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
    const { charges, discounts, adjustments } = await fetchAll(id, tenantId);

    return NextResponse.json({
      success: true,
      commercialPricingStatus: statusRows[0]?.commercialPricingStatus || 'NOT_STARTED',
      charges,
      discounts,
      adjustments,
      summary: computePricingSummary(charges, discounts, adjustments),
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Commercial Pricing Workspace:', error);
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
    const { action, charges, discounts, adjustments } = body as {
      action?: 'SAVE' | 'MARK_READY';
      charges?: PricingLineInput[];
      discounts?: PricingLineInput[];
      adjustments?: PricingLineInput[];
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
        SET commercial_pricing_status = 'READY', updated_at = NOW(), updated_by = ${userId}::uuid
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
    } else {
      const incomingCharges = Array.isArray(charges) ? charges : [];
      const incomingDiscounts = Array.isArray(discounts) ? discounts : [];
      const incomingAdjustments = Array.isArray(adjustments) ? adjustments : [];

      for (const item of incomingCharges) {
        if (!item.description?.trim() || !(Number(item.amount) > 0)) {
          return NextResponse.json(
            { success: false, error: 'Every Charge requires a Description and an Amount greater than 0.' },
            { status: 400 },
          );
        }
      }
      for (const item of incomingDiscounts) {
        if (!item.description?.trim() || !(Number(item.amount) > 0)) {
          return NextResponse.json(
            { success: false, error: 'Every Discount requires a Description and an Amount greater than 0.' },
            { status: 400 },
          );
        }
      }
      for (const item of incomingAdjustments) {
        if (!item.description?.trim() || Number(item.amount) === 0 || Number.isNaN(Number(item.amount))) {
          return NextResponse.json(
            { success: false, error: 'Every Adjustment requires a Description and a non-zero Amount.' },
            { status: 400 },
          );
        }
      }

      await prisma.$transaction(async (tx) => {
        await reconcileCollection(tx, CHARGES_TABLE, id, tenantId, userId, incomingCharges);
        await reconcileCollection(tx, DISCOUNTS_TABLE, id, tenantId, userId, incomingDiscounts);
        await reconcileCollection(tx, ADJUSTMENTS_TABLE, id, tenantId, userId, incomingAdjustments);

        // First successful save moves the workspace from Not Started to In
        // Progress. Ready is always an explicit user decision (Mark Ready).
        await tx.$executeRaw`
          UPDATE cat_quotations
          SET
            commercial_pricing_status = CASE
              WHEN commercial_pricing_status = 'NOT_STARTED' THEN 'IN_PROGRESS'
              ELSE commercial_pricing_status
            END,
            updated_at = NOW(),
            updated_by = ${userId}::uuid
          WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        `;
      });
    }

    const statusRows: any[] = await prisma.$queryRaw`
      SELECT commercial_pricing_status as "commercialPricingStatus"
      FROM cat_quotations
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
    const { charges: refreshedCharges, discounts: refreshedDiscounts, adjustments: refreshedAdjustments } = await fetchAll(
      id,
      tenantId,
    );

    return NextResponse.json({
      success: true,
      commercialPricingStatus: statusRows[0]?.commercialPricingStatus || 'NOT_STARTED',
      charges: refreshedCharges,
      discounts: refreshedDiscounts,
      adjustments: refreshedAdjustments,
      summary: computePricingSummary(refreshedCharges, refreshedDiscounts, refreshedAdjustments),
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error saving Commercial Pricing Workspace:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
