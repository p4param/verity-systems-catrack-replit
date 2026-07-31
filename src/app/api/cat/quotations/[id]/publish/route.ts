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
import { ProposalPublicationSnapshot } from '@/modules/cat/quotation/domain/proposal-publication-types';

// QM-WP04A — Proposal Publication.
// Publishing creates an immutable ProposalPublication snapshot and advances
// the Quotation to a new QuotationRevision. Revision history is never
// stored on the Quotation itself — the Quotation remains editable.

async function fetchQuotationContent(id: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT
      proposal_objective as "proposalObjective",
      executive_notes as "executiveNotes",
      executive_summary_status as "executiveSummaryStatus",
      scope_of_services_status as "scopeOfServicesStatus",
      proposal_narrative as "proposalNarrative",
      internal_author_notes as "internalAuthorNotes",
      proposal_narrative_status as "proposalNarrativeStatus",
      proposal_highlights_status as "proposalHighlightsStatus",
      assumptions_exclusions_status as "assumptionsExclusionsStatus",
      commercial_pricing_status as "commercialPricingStatus",
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
  return rows[0] || null;
}

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const quotation = await fetchQuotationContent(id, tenantId);
    if (!quotation) {
      return NextResponse.json({ success: false, error: 'Quotation record not found' }, { status: 404 });
    }

    const statusByKey: Record<ProposalWorkspaceKey, ProposalWorkspaceStatus> = {
      EXECUTIVE_SUMMARY: quotation.executiveSummaryStatus || 'NOT_STARTED',
      SCOPE_OF_SERVICES: quotation.scopeOfServicesStatus || 'NOT_STARTED',
      PROPOSAL_NARRATIVE: quotation.proposalNarrativeStatus || 'NOT_STARTED',
      PROPOSAL_HIGHLIGHTS: quotation.proposalHighlightsStatus || 'NOT_STARTED',
      ASSUMPTIONS_EXCLUSIONS: quotation.assumptionsExclusionsStatus || 'NOT_STARTED',
      COMMERCIALS: quotation.commercialPricingStatus || 'NOT_STARTED',
      TERMS_CONDITIONS: quotation.commercialTermsStatus || 'NOT_STARTED',
      PROPOSAL_REVIEW: 'NOT_STARTED',
      REVISIONS: 'NOT_STARTED',
      CUSTOMER_DELIVERY: 'NOT_STARTED',
      CUSTOMER_DECISION: 'NOT_STARTED',
    };

    const outstandingWorkspaces = PROPOSAL_HEALTH_WORKSPACE_KEYS.filter((key) => statusByKey[key] !== 'READY').map(
      (key) => PROPOSAL_WORKSPACE_LABELS[key],
    );

    if (outstandingWorkspaces.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quotation is not ready for publication.',
          outstandingWorkspaces,
        },
        { status: 400 },
      );
    }

    const [scopeBlocks, highlights, assumptions, exclusions, charges, discounts, adjustments] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT block_title as "blockTitle", customer_description as "customerDescription", internal_notes as "internalNotes"
        FROM cat_quotation_scope_service_blocks
        WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        ORDER BY display_order ASC
      `,
      prisma.$queryRaw<any[]>`
        SELECT highlight_title as "highlightTitle", highlight_description as "highlightDescription", internal_notes as "internalNotes"
        FROM cat_quotation_proposal_highlights
        WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        ORDER BY display_order ASC
      `,
      prisma.$queryRaw<any[]>`
        SELECT statement FROM cat_quotation_proposal_assumptions
        WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        ORDER BY display_order ASC
      `,
      prisma.$queryRaw<any[]>`
        SELECT statement FROM cat_quotation_proposal_exclusions
        WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        ORDER BY display_order ASC
      `,
      prisma.$queryRaw<any[]>`
        SELECT description, amount FROM cat_quotation_proposal_charges
        WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        ORDER BY display_order ASC
      `,
      prisma.$queryRaw<any[]>`
        SELECT description, amount FROM cat_quotation_proposal_discounts
        WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        ORDER BY display_order ASC
      `,
      prisma.$queryRaw<any[]>`
        SELECT description, amount FROM cat_quotation_proposal_adjustments
        WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        ORDER BY display_order ASC
      `,
    ]);

    const chargeAmounts = charges.map((c) => ({ ...c, amount: Number(c.amount) }));
    const discountAmounts = discounts.map((d) => ({ ...d, amount: Number(d.amount) }));
    const adjustmentAmounts = adjustments.map((a) => ({ ...a, amount: Number(a.amount) }));
    const pricingSummary = computePricingSummary(chargeAmounts, discountAmounts, adjustmentAmounts);

    const snapshot: ProposalPublicationSnapshot = {
      proposalContent: {
        executiveSummary: {
          proposalObjective: quotation.proposalObjective,
          executiveNotes: quotation.executiveNotes,
        },
        scopeOfServices: scopeBlocks,
        proposalNarrative: {
          proposalNarrative: quotation.proposalNarrative,
          internalAuthorNotes: quotation.internalAuthorNotes,
        },
        proposalHighlights: highlights,
        assumptionsExclusions: { assumptions, exclusions },
      },
      commercialPricing: {
        charges: chargeAmounts,
        discounts: discountAmounts,
        adjustments: adjustmentAmounts,
      },
      commercialTerms: {
        validUntil: quotation.validUntil ? new Date(quotation.validUntil).toISOString().slice(0, 10) : undefined,
        validityNotes: quotation.validityNotes,
        paymentMethod: quotation.paymentMethod,
        advanceRequired: quotation.advanceRequired,
        advanceType: quotation.advanceType,
        advanceValue: quotation.advanceValue === null || quotation.advanceValue === undefined ? undefined : Number(quotation.advanceValue),
        balancePayment: quotation.balancePayment,
        commercialNotes: quotation.commercialNotes,
        currencyCode: quotation.currencyCode || 'INR',
      },
      termsAndConditions: quotation.termsAndConditions,
      pricingSummary,
    };

    const publication = await prisma.$transaction(async (tx) => {
      const currentRevisionRows: any[] = await tx.$queryRaw`
        SELECT revision_number as "revisionNumber"
        FROM cat_quotation_revisions
        WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_current = true
        LIMIT 1
      `;
      const nextRevisionNumber = (currentRevisionRows[0]?.revisionNumber ?? -1) + 1;

      await tx.$executeRaw`
        UPDATE cat_quotation_revisions
        SET is_current = false
        WHERE quotation_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_current = true
      `;

      await tx.$executeRaw`
        INSERT INTO cat_quotation_revisions (id, tenant_id, quotation_id, revision_number, status, is_current, created_at, created_by)
        VALUES (gen_random_uuid(), ${tenantId}::uuid, ${id}::uuid, ${nextRevisionNumber}, 'DRAFT', true, NOW(), ${userId}::uuid)
      `;

      const publicationRows: any[] = await tx.$queryRaw`
        INSERT INTO cat_quotation_publications (id, tenant_id, quotation_id, revision_number, status, snapshot_json, published_at, published_by)
        VALUES (gen_random_uuid(), ${tenantId}::uuid, ${id}::uuid, ${nextRevisionNumber}, 'PUBLISHED', ${JSON.stringify(snapshot)}::jsonb, NOW(), ${userId}::uuid)
        RETURNING id, revision_number as "revisionNumber", status, published_at as "publishedAt"
      `;

      return publicationRows[0];
    });

    return NextResponse.json({
      success: true,
      publication: {
        id: publication.id,
        revisionNumber: publication.revisionNumber,
        status: publication.status,
        publishedAt: publication.publishedAt,
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error publishing Proposal:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
