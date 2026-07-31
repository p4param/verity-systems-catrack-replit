import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { DEFAULT_TERMS_AND_CONDITIONS } from '@/modules/cat/quotation/domain/commercial-terms-types';

// QM-WP03B — Commercial Terms Workspace (Quote Validity, Payment Terms,
// Commercial Notes, Currency, and — per Product Review — Terms &
// Conditions folded into this same workspace rather than a separate nav
// tab). All fields live directly on the Quotation entity: no child
// entities, no generic commercial/document abstractions. Dedicated GET +
// PATCH endpoints, same convention as Proposal Narrative.

const ALLOWED_PAYMENT_METHODS = ['BANK_TRANSFER', 'CHEQUE', 'CASH', 'ONLINE'];
const ALLOWED_ADVANCE_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'];

async function ensureQuotationInTenant(quotationId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id FROM cat_quotations
    WHERE id = ${quotationId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] || null;
}

function serializeRow(row: any) {
  return {
    validUntil: row.validUntil ? new Date(row.validUntil).toISOString().slice(0, 10) : undefined,
    validityNotes: row.validityNotes,
    paymentMethod: row.paymentMethod,
    advanceRequired: row.advanceRequired,
    advanceType: row.advanceType,
    advanceValue: row.advanceValue === null || row.advanceValue === undefined ? undefined : Number(row.advanceValue),
    balancePayment: row.balancePayment,
    commercialNotes: row.commercialNotes,
    currencyCode: row.currencyCode || 'INR',
    termsAndConditions: row.termsAndConditions,
    commercialTermsStatus: row.commercialTermsStatus || 'NOT_STARTED',
  };
}

async function fetchContent(id: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT
      valid_until as "validUntil",
      validity_notes as "validityNotes",
      payment_method as "paymentMethod",
      advance_required as "advanceRequired",
      advance_type as "advanceType",
      advance_value as "advanceValue",
      balance_payment as "balancePayment",
      commercial_notes as "commercialNotes",
      currency_code as "currencyCode",
      terms_and_conditions as "termsAndConditions",
      commercial_terms_status as "commercialTermsStatus"
    FROM cat_quotations
    WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] ? serializeRow(rows[0]) : null;
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    let content = await fetchContent(id, tenantId);
    if (!content) {
      return NextResponse.json({ success: false, error: 'Quotation record not found' }, { status: 404 });
    }

    // QM-WP03C: the quotation owns its own copy of Terms & Conditions from
    // first fetch onward — seed the application default once, persist it,
    // and never touch it again automatically.
    if (!content.termsAndConditions?.trim()) {
      await prisma.$executeRaw`
        UPDATE cat_quotations
        SET terms_and_conditions = ${DEFAULT_TERMS_AND_CONDITIONS}
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      content = { ...content, termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS };
    }

    return NextResponse.json({ success: true, ...content });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Commercial Terms Workspace:', error);
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
    const {
      action,
      validUntil,
      validityNotes,
      paymentMethod,
      advanceRequired,
      advanceType,
      advanceValue,
      balancePayment,
      commercialNotes,
      termsAndConditions,
    } = body as {
      action?: 'SAVE' | 'MARK_READY';
      validUntil?: string;
      validityNotes?: string;
      paymentMethod?: string;
      advanceRequired?: boolean;
      advanceType?: string;
      advanceValue?: number;
      balancePayment?: string;
      commercialNotes?: string;
      termsAndConditions?: string;
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
        SET commercial_terms_status = 'READY', updated_at = NOW(), updated_by = ${userId}::uuid
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
    } else {
      if (!validUntil?.trim()) {
        return NextResponse.json({ success: false, error: 'Valid Until is required.' }, { status: 400 });
      }
      if (!paymentMethod || !ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
        return NextResponse.json({ success: false, error: 'Payment Method is required.' }, { status: 400 });
      }
      if (typeof advanceRequired !== 'boolean') {
        return NextResponse.json({ success: false, error: 'Advance Required must be Yes or No.' }, { status: 400 });
      }
      if (advanceRequired) {
        if (!advanceType || !ALLOWED_ADVANCE_TYPES.includes(advanceType)) {
          return NextResponse.json({ success: false, error: 'Advance Type is required when an advance is required.' }, { status: 400 });
        }
        if (!(Number(advanceValue) > 0)) {
          return NextResponse.json(
            { success: false, error: 'Advance Value must be greater than 0 when an advance is required.' },
            { status: 400 },
          );
        }
      }
      if (!balancePayment?.trim()) {
        return NextResponse.json({ success: false, error: 'Balance Payment is required.' }, { status: 400 });
      }
      if (!termsAndConditions?.trim()) {
        return NextResponse.json({ success: false, error: 'Terms & Conditions cannot be empty.' }, { status: 400 });
      }

      // Advance Type / Advance Value are hidden and meaningless unless
      // Advance Required = Yes — clear them server-side so stale values
      // never persist once the user switches back to No.
      const finalAdvanceType = advanceRequired ? advanceType : null;
      const finalAdvanceValue = advanceRequired ? Number(advanceValue) : null;

      await prisma.$executeRaw`
        UPDATE cat_quotations
        SET
          valid_until = ${validUntil}::date,
          validity_notes = ${validityNotes?.trim() || null},
          payment_method = ${paymentMethod},
          advance_required = ${advanceRequired},
          advance_type = ${finalAdvanceType},
          advance_value = ${finalAdvanceValue},
          balance_payment = ${balancePayment.trim()},
          commercial_notes = ${commercialNotes?.trim() || null},
          terms_and_conditions = ${termsAndConditions.trim()},
          commercial_terms_status = CASE
            WHEN commercial_terms_status = 'NOT_STARTED' THEN 'IN_PROGRESS'
            ELSE commercial_terms_status
          END,
          updated_at = NOW(),
          updated_by = ${userId}::uuid
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
    }

    const content = await fetchContent(id, tenantId);
    return NextResponse.json({ success: true, ...content });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error saving Commercial Terms Workspace:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
