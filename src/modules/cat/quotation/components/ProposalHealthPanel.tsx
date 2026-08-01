'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Clock, HeartPulse, History } from 'lucide-react';

import { ProposalWorkspaceStatus } from '@/modules/cat/quotation/domain/quotation-types';
import {
  PROPOSAL_HEALTH_WORKSPACE_KEYS,
  PROPOSAL_WORKSPACE_LABELS,
  ProposalWorkspaceKey,
} from '@/modules/cat/quotation/domain/proposal-workspace-types';

interface ProposalHealthPanelProps {
  // Only implemented workspaces have a real status. Workspaces not present
  // in this map are still placeholders and always read as Not Started —
  // health is updated only from each workspace's own status, never
  // inferred or validated here.
  workspaceStatuses: Partial<Record<ProposalWorkspaceKey, ProposalWorkspaceStatus>>;
  quotationId: string;
  // Passed only to re-check Delivery/Decision existence when the user
  // switches tabs (e.g. after recording one) — informational refresh
  // trigger, not a dependency of any business rule.
  activeWorkspace: ProposalWorkspaceKey;
}

const STATUS_ICON: Record<ProposalWorkspaceStatus, React.ReactNode> = {
  NOT_STARTED: <Circle className="w-3.5 h-3.5 text-muted-foreground/50" />,
  IN_PROGRESS: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  READY: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
};

// Proposal Review, Customer Delivery, Customer Decision, and Event
// Conversion each represent a meaningful business milestone, each with its
// own completion rule (computed here, never a fetched "status" — none of
// these write a Workspace Status field):
// - Proposal Review is "complete" once every authoring workspace is Ready
//   (the same condition that unlocks Publish — reusing workspaceStatuses,
//   already passed in, not a new business rule).
// - Customer Delivery is "complete" once at least one delivery exists.
// - Customer Decision is "complete" once at least one decision exists.
// - Event Conversion is "complete" once the quotation has been converted
//   (reuses the existing GET /convert endpoint's `alreadyConverted` flag).
// Revisions is deliberately NOT a milestone — it's optional history, kept
// visually distinct (its own icon, muted) rather than in the checklist.
function MilestoneRow({ complete, label }: { complete: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {complete ? STATUS_ICON.READY : STATUS_ICON.NOT_STARTED}
      <span className="text-foreground font-medium">{label}</span>
    </div>
  );
}

export function ProposalHealthPanel({ workspaceStatuses, quotationId, activeWorkspace }: ProposalHealthPanelProps) {
  const [hasDeliveries, setHasDeliveries] = useState(false);
  const [hasDecisions, setHasDecisions] = useState(false);
  const [hasConverted, setHasConverted] = useState(false);

  useEffect(() => {
    if (!quotationId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [deliveriesRes, decisionsRes, convertRes] = await Promise.all([
          fetch(`/api/cat/quotations/${quotationId}/deliveries`).then((r) => r.json()),
          fetch(`/api/cat/quotations/${quotationId}/decisions`).then((r) => r.json()),
          fetch(`/api/cat/quotations/${quotationId}/convert`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        if (deliveriesRes.success) setHasDeliveries((deliveriesRes.deliveries || []).length > 0);
        if (decisionsRes.success) setHasDecisions((decisionsRes.decisions || []).length > 0);
        if (convertRes.success) setHasConverted(!!convertRes.alreadyConverted);
      } catch (err) {
        console.error('Failed to load Proposal Lifecycle milestone status for Proposal Health:', err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // Re-checks on tab switch so a delivery/decision/conversion just
    // recorded on another tab is reflected without a full page reload.
  }, [quotationId, activeWorkspace]);

  const proposalReviewComplete = PROPOSAL_HEALTH_WORKSPACE_KEYS.every((key) => (workspaceStatuses[key] ?? 'NOT_STARTED') === 'READY');

  return (
    <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
        <HeartPulse className="w-4 h-4 text-primary" />
        <span>Proposal Health</span>
        <span className="text-[10px] font-medium text-muted-foreground normal-case">(informational only)</span>
      </div>

      <div className="space-y-1.5">
        {PROPOSAL_HEALTH_WORKSPACE_KEYS.map((key) => {
          const status = workspaceStatuses[key] ?? 'NOT_STARTED';
          return (
            <div key={key} className="flex items-center gap-2 text-xs">
              {STATUS_ICON[status]}
              <span className="text-foreground font-medium">{PROPOSAL_WORKSPACE_LABELS[key]}</span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border/30 pt-2.5 space-y-1.5">
        <MilestoneRow complete={proposalReviewComplete} label={PROPOSAL_WORKSPACE_LABELS.PROPOSAL_REVIEW} />

        {/* Revisions — deliberately not a milestone: muted, own icon, no checklist bullet. */}
        <div className="flex items-center gap-2 text-xs">
          <History className="w-3.5 h-3.5 text-muted-foreground/40" />
          <span className="text-muted-foreground">{PROPOSAL_WORKSPACE_LABELS.REVISIONS}</span>
        </div>

        <MilestoneRow complete={hasDeliveries} label={PROPOSAL_WORKSPACE_LABELS.CUSTOMER_DELIVERY} />
        <MilestoneRow complete={hasDecisions} label={PROPOSAL_WORKSPACE_LABELS.CUSTOMER_DECISION} />
        <MilestoneRow complete={hasConverted} label={PROPOSAL_WORKSPACE_LABELS.EVENT_CONVERSION} />
      </div>
    </div>
  );
}
