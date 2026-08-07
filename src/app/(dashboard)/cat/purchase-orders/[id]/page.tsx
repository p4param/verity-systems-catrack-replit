'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Receipt } from 'lucide-react';

import { PURCHASE_ORDER_STATUS_LABELS, PurchaseOrderDetail } from '@/modules/cat/purchase-order/domain/purchase-order-types';
import { PurchaseOrderWorkspaceKey } from '@/modules/cat/purchase-order/domain/purchase-order-workspace-types';
import { PurchaseOrderWorkspaceNavigator } from '@/modules/cat/purchase-order/components/PurchaseOrderWorkspaceNavigator';
import { PurchaseOrderOverviewWorkspace } from '@/modules/cat/purchase-order/components/PurchaseOrderOverviewWorkspace';
import { PurchaseOrderItemsWorkspace } from '@/modules/cat/purchase-order/components/PurchaseOrderItemsWorkspace';

const STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: 'bg-slate-500/10 text-slate-500',
  APPROVED: 'bg-primary/10 text-primary',
  ISSUED: 'bg-emerald-500/10 text-emerald-600',
  CANCELLED: 'bg-rose-500/10 text-rose-600',
};

// PM-WP03B — Purchase Order Workspace. Same tabbed shell pattern as
// every other Workspace in this app (header card, navigator, tab body).
export default function PurchaseOrderWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [po, setPo] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState<PurchaseOrderWorkspaceKey>('OVERVIEW');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cat/purchase-orders/${id}`);
      const data = await res.json();
      if (data.success) setPo(data.item);
    } catch (err) {
      console.error('Failed to load Purchase Order Workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Purchase Order Workspace...</div>;
  }

  if (!po) {
    return (
      <div className="p-10 text-center space-y-2">
        <Receipt className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <h3 className="text-sm font-bold text-foreground">Purchase Order not found.</h3>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      <button
        type="button"
        onClick={() => router.push('/cat/purchase-orders')}
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Purchase Orders</span>
      </button>

      {/* Purchase Order Header */}
      <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-xs space-y-2">
        <span className="font-mono text-[10px] text-muted-foreground/70 tracking-wide">{po.poNumber}</span>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">{po.vendorName}</h1>
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE_CLASS[po.status] || ''}`}>
            {PURCHASE_ORDER_STATUS_LABELS[po.status]}
          </span>
          {po.workDate && <span className="text-[10px] font-medium px-2 py-0.5 bg-muted/40 text-muted-foreground rounded-full">{po.workDate}</span>}
        </div>
      </div>

      {/* Purchase Order Workspace Navigator */}
      <PurchaseOrderWorkspaceNavigator activeWorkspace={activeWorkspace} onSelect={setActiveWorkspace} />

      {/* Current Workspace */}
      {activeWorkspace === 'OVERVIEW' ? (
        <PurchaseOrderOverviewWorkspace po={po} onChanged={load} />
      ) : activeWorkspace === 'ORDER_ITEMS' ? (
        <PurchaseOrderItemsWorkspace po={po} />
      ) : null}
    </div>
  );
}
