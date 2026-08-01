import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import {
  PROPOSAL_HEALTH_WORKSPACE_KEYS,
  PROPOSAL_WORKSPACE_LABELS,
  ProposalWorkspaceKey,
} from '@/modules/cat/quotation/domain/proposal-workspace-types';
import { ProposalWorkspaceStatus } from '@/modules/cat/quotation/domain/quotation-types';
import { computePricingSummary } from '@/modules/cat/quotation/domain/proposal-pricing-types';

// QM-WP03D — Proposal Review Workspace.
// Read-only review dashboard: owns no business data, persists nothing,
// derives everything from existing Quotation information. GET only — no
// PATCH, no new tables, no new columns, no new status fields.

const PROPOSAL_CONTENT_KEYS: ProposalWorkspaceKey[] = [
  'EXECUTIVE_SUMMARY',
  'SCOPE_OF_SERVICES',
  'PROPOSAL_NARRATIVE',
  'PROPOSAL_HIGHLIGHTS',
  'ASSUMPTIONS_EXCLUSIONS',
];

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const rows: any[] = await prisma.$queryRaw`
      SELECT
        executive_summary_status as "executiveSummaryStatus",
        scope_of_services_status as "scopeOfServicesStatus",
        proposal_narrative_status as "proposalNarrativeStatus",
        proposal_highlights_status as "proposalHighlightsStatus",
        assumptions_exclusions_status as "assumptionsExclusionsStatus",
        commercial_pricing_status as "commercialPricingStatus",
        commercial_terms_status as "commercialTermsStatus",
        valid_until as "validUntil",
        payment_method as "paymentMethod",
        advance_required as "advanceRequired",
        currency_code as "currencyCode"
      FROM cat_quotations
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ success: false, error: 'Quotation record not found' }, { status: 404 });
    }

    const statusByKey: Record<ProposalWorkspaceKey, ProposalWorkspaceStatus> = {
      EXECUTIVE_SUMMARY: row.executiveSummaryStatus || 'NOT_STARTED',
      SCOPE_OF_SERVICES: row.scopeOfServicesStatus || 'NOT_STARTED',
      PROPOSAL_NARRATIVE: row.proposalNarrativeStatus || 'NOT_STARTED',
      PROPOSAL_HIGHLIGHTS: row.proposalHighlightsStatus || 'NOT_STARTED',
      ASSUMPTIONS_EXCLUSIONS: row.assumptionsExclusionsStatus || 'NOT_STARTED',
      COMMERCIALS: row.commercialPricingStatus || 'NOT_STARTED',
      TERMS_CONDITIONS: row.commercialTermsStatus || 'NOT_STARTED',
      PROPOSAL_REVIEW: 'NOT_STARTED', // Proposal Review has no status of its own.
      REVISIONS: 'NOT_STARTED', // Revisions has no status of its own.
      CUSTOMER_DELIVERY: 'NOT_STARTED', // Customer Delivery has no status of its own.
      CUSTOMER_DECISION: 'NOT_STARTED', // Customer Decision has no status of its own.
      EVENT_CONVERSION: 'NOT_STARTED', // Event Conversion has no status of its own.
    };

    const proposalContent = PROPOSAL_CONTENT_KEYS.map((key) => ({
      key,
      label: PROPOSAL_WORKSPACE_LABELS[key],
      status: statusByKey[key],
    }));

    const [charges, discounts, adjustments] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT amount FROM cat_quotation_proposal_charges
        WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `,
      prisma.$queryRaw<any[]>`
        SELECT amount FROM cat_quotation_proposal_discounts
        WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `,
      prisma.$queryRaw<any[]>`
        SELECT amount FROM cat_quotation_proposal_adjustments
        WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `,
    ]);
    const pricingSummary = computePricingSummary(
      charges.map((c) => ({ amount: Number(c.amount) })),
      discounts.map((d) => ({ amount: Number(d.amount) })),
      adjustments.map((a) => ({ amount: Number(a.amount) })),
    );

    const outstandingWorkspaces = PROPOSAL_HEALTH_WORKSPACE_KEYS.filter((key) => statusByKey[key] !== 'READY').map(
      (key) => PROPOSAL_WORKSPACE_LABELS[key],
    );

    return NextResponse.json({
      success: true,
      proposalContent,
      commercialPricing: {
        chargesTotal: pricingSummary.chargesTotal,
        discountTotal: pricingSummary.discountTotal,
        adjustmentTotal: pricingSummary.adjustmentTotal,
        grandTotal: pricingSummary.grandTotal,
        status: statusByKey.COMMERCIALS,
      },
      commercialTerms: {
        validUntil: row.validUntil ? new Date(row.validUntil).toISOString().slice(0, 10) : undefined,
        paymentMethod: row.paymentMethod,
        advanceRequired: row.advanceRequired,
        currencyCode: row.currencyCode || 'INR',
        status: statusByKey.TERMS_CONDITIONS,
      },
      overallReady: outstandingWorkspaces.length === 0,
      outstandingWorkspaces,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Proposal Review:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
