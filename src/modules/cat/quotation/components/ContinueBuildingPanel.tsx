'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

import { ProposalWorkspaceStatus } from '@/modules/cat/quotation/domain/quotation-types';
import {
  PROPOSAL_HEALTH_WORKSPACE_KEYS,
  PROPOSAL_WORKSPACE_LABELS,
  ProposalWorkspaceKey,
} from '@/modules/cat/quotation/domain/proposal-workspace-types';

interface ContinueBuildingPanelProps {
  workspaceStatuses: Partial<Record<ProposalWorkspaceKey, ProposalWorkspaceStatus>>;
  onOpenWorkspace: (key: ProposalWorkspaceKey) => void;
}

// Continue Building follows Workspace Health status only — sequential
// guidance, not a workflow engine and not an approval gate.
function nextIncompleteWorkspace(
  workspaceStatuses: Partial<Record<ProposalWorkspaceKey, ProposalWorkspaceStatus>>,
): ProposalWorkspaceKey {
  const next = PROPOSAL_HEALTH_WORKSPACE_KEYS.find((key) => (workspaceStatuses[key] ?? 'NOT_STARTED') !== 'READY');
  return next ?? PROPOSAL_HEALTH_WORKSPACE_KEYS[PROPOSAL_HEALTH_WORKSPACE_KEYS.length - 1];
}

export function ContinueBuildingPanel({ workspaceStatuses, onOpenWorkspace }: ContinueBuildingPanelProps) {
  const target = nextIncompleteWorkspace(workspaceStatuses);

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
