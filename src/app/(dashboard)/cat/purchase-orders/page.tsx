'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileText, Plus, Receipt, Search, XCircle } from 'lucide-react';

import {
  PURCHASE_ORDER_ORIGIN_LABELS,
  PURCHASE_ORDER_STATUS_LABELS,
  PurchaseOrderOrigin,
  PurchaseOrderStatus,
  PurchaseOrderSummary,
} from '@/modules/cat/purchase-order/domain/purchase-order-types';

const STATUS_FILTER_OPTIONS: Array<PurchaseOrderStatus | ''> = ['', 'DRAFT', 'APPROVED', 'ISSUED', 'CANCELLED'];
const ORIGIN_FILTER_OPTIONS: Array<PurchaseOrderOrigin | ''> = ['', 'PLANNING', 'MANUAL'];

const STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  APPROVED: 'bg-primary/10 text-primary border-primary/20',
  ISSUED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  CANCELLED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

// PM-WP03B — Purchase Order Directory. Same KPI/search/filter/table
// pattern as every other CAT directory in this app. No Quick Create
// modal, deliberately — Purchase Orders originate exclusively from
// Purchase Order Review, reached either from Purchase Planning (pre-
// filled) or from the "New Purchase Order" button here (empty, Manual).
// This mirrors Events having no direct POST /api/cat/events route at
// all — creation is always a Review/convert flow, never a blank form
// that immediately persists.
export default function PurchaseOrderDirectoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<PurchaseOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | ''>('');
  const [originFilter, setOriginFilter] = useState<PurchaseOrderOrigin | ''>('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (statusFilter) params.set('status', statusFilter);
      if (originFilter) params.set('origin', originFilter);

      const res = await fetch(`/api/cat/purchase-orders?${params.toString()}`);
      const data = await res.json();
      if (data.success) setItems(data.items || []);
    } catch (err) {
      console.error('Failed to fetch Purchase Orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter, originFilter]);

  const kpis = useMemo(() => {
    const total = items.length;
    const draft = items.filter((i) => i.status === 'DRAFT').length;
    const open = items.filter((i) => i.status === 'APPROVED' || i.status === 'ISSUED').length;
    const cancelled = items.filter((i) => i.status === 'CANCELLED').length;
    return { total, draft, open, cancelled };
  }, [items]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* 1. Header & Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border border-border/40 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-0.5">
            <Receipt className="w-3.5 h-3.5" />
            <span>PM-WP03 — Purchase Order Management</span>
          </div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Purchase Orders</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Created from Purchase Planning, or manually for emergency purchases. Nothing is saved until Purchase Order Review's Save Draft.
          </p>
        </div>

        <button
          onClick={() => router.push('/cat/purchase-orders/review')}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-foreground tracking-tight">{kpis.total}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Total Purchase Orders</div>
          </div>
          <Receipt className="w-4 h-4 text-primary/70" />
        </div>
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-slate-600 dark:text-slate-400 tracking-tight">{kpis.draft}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Draft</div>
          </div>
          <FileText className="w-4 h-4 text-slate-500/70" />
        </div>
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{kpis.open}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Approved + Issued</div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
        </div>
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{kpis.cancelled}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Cancelled</div>
          </div>
          <XCircle className="w-4 h-4 text-rose-500/70" />
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="bg-card p-3 rounded-xl border border-border/40 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search PO number or Vendor..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-muted/30 border border-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg border border-border/40 text-xs">
          <span className="text-[10px] text-muted-foreground font-medium px-2">Status:</span>
          {STATUS_FILTER_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                statusFilter === s ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === '' ? 'All' : PURCHASE_ORDER_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg border border-border/40 text-xs">
          <span className="text-[10px] text-muted-foreground font-medium px-2">Origin:</span>
          {ORIGIN_FILTER_OPTIONS.map((o) => (
            <button
              key={o}
              onClick={() => setOriginFilter(o)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                originFilter === o ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {o === '' ? 'All' : PURCHASE_ORDER_ORIGIN_LABELS[o]}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Directory Table */}
      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Purchase Orders...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Receipt className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" />
            <h3 className="text-sm font-bold text-foreground">No Purchase Orders yet.</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Select Ready rows on Purchase Planning and click &apos;Create Purchase Order&apos;, or click &apos;New Purchase Order&apos; above for a manual one.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-2">PO Number</div>
              <div className="col-span-3">Vendor</div>
              <div className="col-span-2">Origin</div>
              <div className="col-span-2">Work Date</div>
              <div className="col-span-1 text-right">Items</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/cat/purchase-orders/${item.id}`)}
                className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-muted/30 transition-colors duration-150 cursor-pointer group"
              >
                <div className="col-span-2 text-[11px] font-mono font-semibold text-muted-foreground truncate">{item.poNumber}</div>
                <div className="col-span-3 font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">{item.vendorName}</div>
                <div className="col-span-2 text-xs text-muted-foreground truncate">{item.origin === 'PLANNING' ? 'Purchase Planning' : 'Manual'}</div>
                <div className="col-span-2 text-xs text-muted-foreground truncate">{item.workDate || '—'}</div>
                <div className="col-span-1 text-xs text-muted-foreground text-right">{item.itemCount}</div>
                <div className="col-span-2 text-right">
                  <span
                    className={`inline-flex items-center text-[9px] px-2 py-0.5 font-bold rounded-full border ${STATUS_BADGE_CLASS[item.status] || ''}`}
                  >
                    {PURCHASE_ORDER_STATUS_LABELS[item.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
