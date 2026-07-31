'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, DollarSign, FileText } from 'lucide-react';

import {
  ProposalWorkspaceStatus,
  QUOTATION_PURPOSE_LABELS,
  QUOTATION_STATUS_LABELS,
  QuotationDetail,
  QuotationExecutiveSummary,
} from '@/modules/cat/quotation/domain/quotation-types';
import { PROPOSAL_WORKSPACE_NAV_ITEMS, ProposalWorkspaceKey } from '@/modules/cat/quotation/domain/proposal-workspace-types';
import { ProposalHealthPanel } from '@/modules/cat/quotation/components/ProposalHealthPanel';
import { ContinueBuildingPanel } from '@/modules/cat/quotation/components/ContinueBuildingPanel';
import { ProposalWorkspaceNavigator } from '@/modules/cat/quotation/components/ProposalWorkspaceNavigator';
import { ExecutiveSummaryWorkspace } from '@/modules/cat/quotation/components/ExecutiveSummaryWorkspace';
import { ScopeOfServicesWorkspace } from '@/modules/cat/quotation/components/ScopeOfServicesWorkspace';
import { ProposalNarrativeWorkspace } from '@/modules/cat/quotation/components/ProposalNarrativeWorkspace';
import { ProposalHighlightsWorkspace } from '@/modules/cat/quotation/components/ProposalHighlightsWorkspace';
import { AssumptionsExclusionsWorkspace } from '@/modules/cat/quotation/components/AssumptionsExclusionsWorkspace';
import { CommercialPricingWorkspace } from '@/modules/cat/quotation/components/CommercialPricingWorkspace';
import { CommercialTermsWorkspace } from '@/modules/cat/quotation/components/CommercialTermsWorkspace';
import { ProposalReviewWorkspace } from '@/modules/cat/quotation/components/ProposalReviewWorkspace';

export default function QuotationWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState<ProposalWorkspaceKey>('EXECUTIVE_SUMMARY');

  React.useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/quotations/${id}`);
        const data = await res.json();
        if (data.success) {
          setQuotation(data.quotation);
        }
      } catch (err) {
        console.error('Failed to load quotation workspace:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleExecutiveSummarySaved = (patch: QuotationExecutiveSummary) => {
    setQuotation((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleScopeOfServicesSaved = (scopeOfServicesStatus: ProposalWorkspaceStatus) => {
    setQuotation((prev) => (prev ? { ...prev, scopeOfServicesStatus } : prev));
  };

  const handleProposalNarrativeSaved = (proposalNarrativeStatus: ProposalWorkspaceStatus) => {
    setQuotation((prev) => (prev ? { ...prev, proposalNarrativeStatus } : prev));
  };

  const handleProposalHighlightsSaved = (proposalHighlightsStatus: ProposalWorkspaceStatus) => {
    setQuotation((prev) => (prev ? { ...prev, proposalHighlightsStatus } : prev));
  };

  const handleAssumptionsExclusionsSaved = (assumptionsExclusionsStatus: ProposalWorkspaceStatus) => {
    setQuotation((prev) => (prev ? { ...prev, assumptionsExclusionsStatus } : prev));
  };

  const handleCommercialPricingSaved = (commercialPricingStatus: ProposalWorkspaceStatus) => {
    setQuotation((prev) => (prev ? { ...prev, commercialPricingStatus } : prev));
  };

  const handleCommercialTermsSaved = (commercialTermsStatus: ProposalWorkspaceStatus) => {
    setQuotation((prev) => (prev ? { ...prev, commercialTermsStatus } : prev));
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Quotation Workspace...</div>;
  }

  if (!quotation) {
    return (
      <div className="p-10 text-center space-y-2">
        <DollarSign className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <h3 className="text-sm font-bold text-foreground">Quotation not found.</h3>
      </div>
    );
  }

  const workspaceStatuses: Partial<Record<ProposalWorkspaceKey, ProposalWorkspaceStatus>> = {
    EXECUTIVE_SUMMARY: quotation.executiveSummaryStatus,
    SCOPE_OF_SERVICES: quotation.scopeOfServicesStatus,
    PROPOSAL_NARRATIVE: quotation.proposalNarrativeStatus,
    PROPOSAL_HIGHLIGHTS: quotation.proposalHighlightsStatus,
    ASSUMPTIONS_EXCLUSIONS: quotation.assumptionsExclusionsStatus,
    COMMERCIALS: quotation.commercialPricingStatus,
    TERMS_CONDITIONS: quotation.commercialTermsStatus,
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      <button
        type="button"
        onClick={() => router.push('/cat/quotations')}
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Quotation Directory</span>
      </button>

      {/* Quotation Header — reused from QM-WP01, no layout redesign.
          Title is the primary focal point; badges are secondary metadata. */}
      <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-xs space-y-2">
        <span className="font-mono text-[10px] text-muted-foreground/70 tracking-wide">{quotation.quotationNumber}</span>

        <h1 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">{quotation.title}</h1>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-medium px-2 py-0.5 bg-muted/40 text-muted-foreground rounded-full">
            {QUOTATION_PURPOSE_LABELS[quotation.purpose] || quotation.purpose}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 bg-muted/40 text-muted-foreground rounded-full">
            {QUOTATION_STATUS_LABELS[quotation.status] || quotation.status}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 bg-muted/40 text-muted-foreground rounded-full">
            Revision {quotation.currentRevision?.revisionNumber ?? 0}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>{quotation.relationshipName || 'Unassigned'}</span>
          </span>
          <button
            type="button"
            onClick={() => router.push(`/cat/inquiries/${quotation.inquiryId}`)}
            className="flex items-center gap-1.5 text-primary hover:underline cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>
              {quotation.inquiryNumber} — {quotation.inquiryTitle}
            </span>
          </button>
        </div>
      </div>

      {/* Proposal Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <ProposalHealthPanel workspaceStatuses={workspaceStatuses} />
        </div>
        <div className="lg:col-span-2 space-y-3">
          <ContinueBuildingPanel workspaceStatuses={workspaceStatuses} onOpenWorkspace={setActiveWorkspace} />
          <ProposalWorkspaceNavigator activeWorkspace={activeWorkspace} onSelect={setActiveWorkspace} />
        </div>
      </div>

      {/* Current Workspace (+ Workspace Action Bar, where applicable) */}
      {activeWorkspace === 'EXECUTIVE_SUMMARY' ? (
        <ExecutiveSummaryWorkspace quotation={quotation} onSaved={handleExecutiveSummarySaved} />
      ) : activeWorkspace === 'SCOPE_OF_SERVICES' ? (
        <ScopeOfServicesWorkspace quotation={quotation} onSaved={handleScopeOfServicesSaved} />
      ) : activeWorkspace === 'PROPOSAL_NARRATIVE' ? (
        <ProposalNarrativeWorkspace quotation={quotation} onSaved={handleProposalNarrativeSaved} />
      ) : activeWorkspace === 'PROPOSAL_HIGHLIGHTS' ? (
        <ProposalHighlightsWorkspace quotation={quotation} onSaved={handleProposalHighlightsSaved} />
      ) : activeWorkspace === 'ASSUMPTIONS_EXCLUSIONS' ? (
        <AssumptionsExclusionsWorkspace quotation={quotation} onSaved={handleAssumptionsExclusionsSaved} />
      ) : activeWorkspace === 'COMMERCIALS' ? (
        <CommercialPricingWorkspace quotation={quotation} onSaved={handleCommercialPricingSaved} />
      ) : activeWorkspace === 'TERMS_CONDITIONS' ? (
        <CommercialTermsWorkspace quotation={quotation} onSaved={handleCommercialTermsSaved} />
      ) : activeWorkspace === 'PROPOSAL_REVIEW' ? (
        <ProposalReviewWorkspace quotation={quotation} onEditWorkspace={setActiveWorkspace} />
      ) : (
        (() => {
          const item = PROPOSAL_WORKSPACE_NAV_ITEMS.find((w) => w.key === activeWorkspace);
          return (
            <div className="bg-card p-12 rounded-2xl border border-border/40 text-center space-y-2">
              <FileText className="w-10 h-10 text-indigo-600 mx-auto opacity-60 mb-1" />
              <h3 className="text-sm font-bold text-foreground">{item?.label}</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">{item?.description}</p>
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider pt-1">Coming in {item?.comingIn}</p>
            </div>
          );
        })()
      )}
    </div>
  );
}
