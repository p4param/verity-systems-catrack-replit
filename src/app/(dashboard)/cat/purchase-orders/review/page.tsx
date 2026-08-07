'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { PurchaseOrderReviewPanel } from '@/modules/cat/purchase-order/components/PurchaseOrderReviewPanel';

// PM-WP03B — Manual Purchase Order entry point. Reached from the
// Directory's "New Purchase Order" button — starts completely empty (no
// Vendor, no items), and renders the exact same PurchaseOrderReviewPanel
// the Purchase Planning flow uses (just with origin="MANUAL" and no
// pre-fill), per the PM-WP03A Engineering Package: "Nothing is persisted
// until Save Draft," reused architecturally, not duplicated.
export default function ManualPurchaseOrderReviewPage() {
  const router = useRouter();

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-12">
      <button
        type="button"
        onClick={() => router.push('/cat/purchase-orders')}
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Purchase Orders</span>
      </button>

      <div className="bg-card border border-border/40 rounded-2xl shadow-xs p-6 space-y-4">
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Purchase Order Review</h1>
          <p className="text-xs text-muted-foreground mt-1">Manual Purchase Order — build it from scratch. Nothing is saved until you click Save Draft.</p>
        </div>

        <PurchaseOrderReviewPanel
          origin="MANUAL"
          onCancel={() => router.push('/cat/purchase-orders')}
          onSaved={(id) => router.push(`/cat/purchase-orders/${id}`)}
        />
      </div>
    </div>
  );
}
