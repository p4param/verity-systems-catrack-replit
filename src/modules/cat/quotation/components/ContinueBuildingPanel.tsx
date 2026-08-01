'use client';

import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { ProposalWorkspaceStatus } from '@/modules/cat/quotation/domain/quotation-types';
import {
  PROPOSAL_HEALTH_WORKSPACE_KEYS,
  PROPOSAL_WORKSPACE_LABELS,
  ProposalWorkspaceKey,
} from '@/modules/cat/quotation/domain/proposal-workspace-types';

interface ContinueBuildingPanelProps {
  workspaceStatuses: Partial<Record<ProposalWorkspaceKey, ProposalWorkspaceStatus>>;
  activeWorkspace: ProposalWorkspaceKey;
  onOpenWorkspace: (key: ProposalWorkspaceKey) => void;
}

// The 4 Proposal Lifecycle workspaces, in the order Continue advances
// through once every authoring workspace is Ready. They carry no
// Workspace Status of their own, so — unlike the 7 authoring workspaces —
// position here is read from which one is currently open, not from a
// readiness/completion state. Purely navigational, not a workflow engine
// and not an approval gate, same as the authoring sequence already was.
const LIFECYCLE_SEQUENCE: ProposalWorkspaceKey[] = ['PROPOSAL_REVIEW', 'REVISIONS', 'CUSTOMER_DELIVERY', 'CUSTOMER_DECISION'];

function nextTarget(
  workspaceStatuses: Partial<Record<ProposalWorkspaceKey, ProposalWorkspaceStatus>>,
  activeWorkspace: ProposalWorkspaceKey,
): ProposalWorkspaceKey | 'COMPLETE' {
  const nextAuthoring = PROPOSAL_HEALTH_WORKSPACE_KEYS.find((key) => (workspaceStatuses[key] ?? 'NOT_STARTED') !== 'READY');
  if (nextAuthoring) return nextAuthoring;

  const lifecycleIndex = LIFECYCLE_SEQUENCE.indexOf(activeWorkspace);
  if (lifecycleIndex === -1) {
    // All 7 authoring workspaces are Ready, but the user isn't on a
    // Lifecycle workspace yet — point at the first one, Proposal Review.
    return LIFECYCLE_SEQUENCE[0];
  }
  if (lifecycleIndex === LIFECYCLE_SEQUENCE.length - 1) {
    return 'COMPLETE';
  }
  return LIFECYCLE_SEQUENCE[lifecycleIndex + 1];
}

export function ContinueBuildingPanel({ workspaceStatuses, activeWorkspace, onOpenWorkspace }: ContinueBuildingPanelProps) {
  const target = nextTarget(workspaceStatuses, activeWorkspace);

  if (target === 'COMPLETE') {
    return (
      <div className="flex items-center gap-2 text-xs">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="text-foreground font-bold">Proposal Lifecycle complete — every workspace has been reviewed.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-muted-foreground font-medium shrink-0">Next up:</span>
        <span className="text-foreground font-bold truncate">{PROPOSAL_WORKSPACE_LABELS[target]}</span>
      </div>

      <button
        type="button"
        onClick={() => onOpenWorkspace(target)}
        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0 cursor-pointer"
      >
        <span>Continue</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
