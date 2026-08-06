'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Truck } from 'lucide-react';

import { VENDOR_STATUS_LABELS, VendorDetail } from '@/modules/cat/vendor/domain/vendor-types';
import { VendorWorkspaceKey } from '@/modules/cat/vendor/domain/vendor-workspace-types';
import { VendorWorkspaceNavigator } from '@/modules/cat/vendor/components/VendorWorkspaceNavigator';
import { VendorOverviewWorkspace } from '@/modules/cat/vendor/components/VendorOverviewWorkspace';
import { VendorSupplyPortfolioWorkspace } from '@/modules/cat/vendor/components/VendorSupplyPortfolioWorkspace';

// PM-WP01 — Vendor Master Workspace. Standalone Operations workspace
// shell — same tabbed pattern as the Event Workspace — for a single
// Vendor. A Vendor supplies business resources to the organization; this
// is not an Ingredient Supplier Master, hence the two tabs: Overview
// (identity/contact/commercial) and Supply Portfolio (what it supplies).
export default function VendorWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState<VendorWorkspaceKey>('OVERVIEW');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/vendors/${id}`);
        const data = await res.json();
        if (data.success) setVendor(data.item);
      } catch (err) {
        console.error('Failed to load Vendor Workspace:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Vendor Workspace...</div>;
  }

  if (!vendor) {
    return (
      <div className="p-10 text-center space-y-2">
        <Truck className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <h3 className="text-sm font-bold text-foreground">Vendor not found.</h3>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      <button
        type="button"
        onClick={() => router.push('/cat/vendors')}
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Vendors</span>
      </button>

      {/* Vendor Header */}
      <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-xs space-y-2">
        <span className="font-mono text-[10px] text-muted-foreground/70 tracking-wide">{vendor.vendorCode}</span>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">{vendor.name}</h1>
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-full">{VENDOR_STATUS_LABELS[vendor.status]}</span>
          {vendor.businessCategory && <span className="text-[10px] font-medium px-2 py-0.5 bg-muted/40 text-muted-foreground rounded-full">{vendor.businessCategory}</span>}
        </div>
      </div>

      {/* Vendor Workspace Navigator */}
      <VendorWorkspaceNavigator activeWorkspace={activeWorkspace} onSelect={setActiveWorkspace} />

      {/* Current Workspace */}
      {activeWorkspace === 'OVERVIEW' ? (
        <VendorOverviewWorkspace vendorId={id} />
      ) : activeWorkspace === 'SUPPLY_PORTFOLIO' ? (
        <VendorSupplyPortfolioWorkspace vendorId={id} />
      ) : null}
    </div>
  );
}
