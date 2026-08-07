'use client';

import React from 'react';
import { Activity, FileStack, LayoutDashboard, ListOrdered, Lock, StickyNote } from 'lucide-react';

import { PURCHASE_ORDER_WORKSPACE_NAV_ITEMS, PurchaseOrderWorkspaceKey } from '@/modules/cat/purchase-order/domain/purchase-order-workspace-types';

const WORKSPACE_ICONS: Record<PurchaseOrderWorkspaceKey, React.ComponentType<{ className?: string }>> = {
  OVERVIEW: LayoutDashboard,
  ORDER_ITEMS: ListOrdered,
  ACTIVITY: Activity,
  DOCUMENTS: FileStack,
  NOTES: StickyNote,
};

interface PurchaseOrderWorkspaceNavigatorProps {
  activeWorkspace: PurchaseOrderWorkspaceKey;
  onSelect: (key: PurchaseOrderWorkspaceKey) => void;
}

// PM-WP03B — mirrors VendorWorkspaceNavigator's flat pill-list visual
// convention, plus the Quotation Proposal Workspace's disabled/locked-tab
// mechanism (ProposalWorkspaceNavigator.tsx) for Activity/Documents/Notes
// — reused verbatim rather than inventing a new "coming soon" pattern.
export function PurchaseOrderWorkspaceNavigator({ activeWorkspace, onSelect }: PurchaseOrderWorkspaceNavigatorProps) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs p-3.5 space-y-2">
      <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-0.5">Purchase Order Workspaces</div>
      <div className="flex flex-wrap items-center gap-2">
        {PURCHASE_ORDER_WORKSPACE_NAV_ITEMS.map((item) => {
          const Icon = WORKSPACE_ICONS[item.key];
          const isActive = activeWorkspace === item.key;

          if (item.disabled) {
            return (
              <span
                key={item.key}
                title={`${item.description} — Coming in ${item.comingIn}`}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap text-muted-foreground/40 border border-dashed border-border/40 cursor-not-allowed"
              >
                <Lock className="w-3 h-3" />
                <span>{item.label}</span>
              </span>
            );
          }

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              title={item.description}
              className={`px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-primary-foreground font-extrabold shadow-sm'
                  : 'font-bold text-muted-foreground border border-transparent hover:border-border/50 hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
