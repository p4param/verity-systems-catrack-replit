'use client';

import React from 'react';
import { LayoutDashboard, Boxes } from 'lucide-react';

import { VENDOR_WORKSPACE_NAV_ITEMS, VendorWorkspaceKey } from '@/modules/cat/vendor/domain/vendor-workspace-types';

const WORKSPACE_ICONS: Record<VendorWorkspaceKey, React.ComponentType<{ className?: string }>> = {
  OVERVIEW: LayoutDashboard,
  SUPPLY_PORTFOLIO: Boxes,
};

interface VendorWorkspaceNavigatorProps {
  activeWorkspace: VendorWorkspaceKey;
  onSelect: (key: VendorWorkspaceKey) => void;
}

// PM-WP01 — Vendor Master. Mirrors EventWorkspaceNavigator's visual
// convention (titled navigator card, pill items) for consistency across
// the ERP.
export function VendorWorkspaceNavigator({ activeWorkspace, onSelect }: VendorWorkspaceNavigatorProps) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs p-3.5 space-y-2">
      <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-0.5">Vendor Workspaces</div>
      <div className="flex flex-wrap items-center gap-2">
        {VENDOR_WORKSPACE_NAV_ITEMS.map((item) => {
          const Icon = WORKSPACE_ICONS[item.key];
          const isActive = activeWorkspace === item.key;
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
