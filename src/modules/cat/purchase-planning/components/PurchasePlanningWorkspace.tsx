'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  Star,
  Truck,
} from 'lucide-react';

import { VendorStatus } from '@/modules/cat/vendor/domain/vendor-types';
import {
  PURCHASE_PLANNING_STATUS_LABELS,
  PurchasePlanningResponse,
  PurchasePlanningRow,
  PurchasePlanningStatus,
} from '@/modules/cat/purchase-planning/domain/purchase-planning-types';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmt(qty: number): string {
  return Number(qty.toFixed(2)).toString();
}

function SummaryCard({
  value,
  label,
  icon: Icon,
  accentClass,
}: {
  value: React.ReactNode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
}) {
  return (
    <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
      <div>
        <div className="text-2xl font-black text-foreground tracking-tight">{value}</div>
        <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">{label}</div>
      </div>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accentClass}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
}

const inputClass =
  'w-full bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary';

// Same Event status filter Production Center exposes — Purchase Planning
// forwards it straight into the same Work Date -> Events resolution, it
// does not filter by the Purchase Planning row Status (that's the grid's
// own Status column, not a header control).
const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PRODUCTION_READY', label: 'Production Ready' },
];

const PLANNING_STATUS_BADGE_CLASS: Record<PurchasePlanningStatus, string> = {
  READY: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  NO_VENDOR: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  NO_ACTIVE_VENDOR: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  BLOCKED_PREFERRED_VENDOR: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  INACTIVE_PREFERRED_VENDOR: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  MULTIPLE_PREFERRED_VENDORS: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
};

const VENDOR_STATUS_BADGE_CLASS: Record<VendorStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  INACTIVE: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  BLOCKED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

type SortKey = 'name' | 'quantity';

function StatusBadge({ status }: { status: PurchasePlanningStatus }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PLANNING_STATUS_BADGE_CLASS[status]}`}>
      {PURCHASE_PLANNING_STATUS_LABELS[status]}
    </span>
  );
}

// PM-WP02 — Purchase Planning. Standalone Operations workspace, same
// visual/interaction pattern as Production Center: header (Work Date +
// Status + Refresh), Dashboard KPIs, a search/sort-able grid with
// expandable rows. Pure report — no inputs persist anything, no editing
// of a Vendor's preferred flag or status here (that's owned by Vendor
// Master's Supply Portfolio tab). Recommendation Reason text lives in the
// expanded panel per Product Review, not as its own grid column — the
// grid only shows the Status badge.
export function PurchasePlanningWorkspace() {
  const [workDate, setWorkDate] = useState(todayIso());
  const [status, setStatus] = useState('ALL');
  const [data, setData] = useState<PurchasePlanningResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ workDate, status });
      const res = await fetch(`/api/cat/purchase-planning?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json);
      else setError(json.error || 'Failed to load Purchase Planning.');
    } catch (err: any) {
      setError(err.message || 'Failed to load Purchase Planning.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workDate, status]);

  const toggle = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredRows = useMemo(() => {
    if (!data) return [];
    let rows = data.rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.ingredientName.toLowerCase().includes(q) || r.ingredientCode.toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) =>
      sortKey === 'name' ? a.ingredientName.localeCompare(b.ingredientName) : b.requiredQuantity - a.requiredQuantity,
    );
    return rows;
  }, [data, search, sortKey]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Purchase Planning</h1>
        <p className="text-xs text-muted-foreground mt-1">Which Vendor should supply each ingredient required for this Work Date?</p>
      </div>

      {/* Header */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-xs p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Work Date</label>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
            <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted/60 text-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:bg-muted transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

      {loading && !data ? (
        <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Purchase Planning...</div>
      ) : data ? (
        <>
          {/* Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard value={data.dashboard.ingredients} label="Ingredients" icon={Boxes} accentClass="bg-violet-500/10 text-violet-600" />
            <SummaryCard value={data.dashboard.vendorCoverage} label="Vendor Coverage" icon={Truck} accentClass="bg-primary/10 text-primary" />
            <SummaryCard value={data.dashboard.ready} label="Ready" icon={CheckCircle2} accentClass="bg-emerald-500/10 text-emerald-600" />
            <SummaryCard value={data.dashboard.warnings} label="Warnings" icon={AlertTriangle} accentClass="bg-amber-500/10 text-amber-600" />
          </div>

          {/* Planning Grid */}
          <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border/40 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Planning Grid</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Recommended Vendor for every ingredient in Production Center's Consolidated Ingredient Demand. Read-only — expand a
                  row for the full Vendor List and the reason behind the recommendation.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-48 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search ingredient..."
                    className={`${inputClass} pl-8`}
                  />
                </div>
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={inputClass}>
                  <option value="name">Sort: Name</option>
                  <option value="quantity">Sort: Quantity</option>
                </select>
              </div>
            </div>
            <div className="p-5">
              {filteredRows.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No consolidated ingredient demand for this Work Date.</p>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-2">Ingredient Code</div>
                    <div className="col-span-3">Ingredient</div>
                    <div className="col-span-1 text-right">Required Qty</div>
                    <div className="col-span-1">Unit</div>
                    <div className="col-span-1 text-right">Vendors</div>
                    <div className="col-span-2">Recommended Vendor</div>
                    <div className="col-span-2">Status</div>
                  </div>
                  {filteredRows.map((row) => (
                    <PlanningRow key={`${row.ingredientId}::${row.unit}`} row={row} expanded={expandedKeys.has(`${row.ingredientId}::${row.unit}`)} onToggle={() => toggle(`${row.ingredientId}::${row.unit}`)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function PlanningRow({ row, expanded, onToggle }: { row: PurchasePlanningRow; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="border border-border/40 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full grid grid-cols-2 sm:grid-cols-12 gap-2 px-3 py-2.5 items-center text-left cursor-pointer hover:bg-muted/20 transition"
      >
        <div className="sm:col-span-2 font-mono text-[10px] text-muted-foreground">{row.ingredientCode}</div>
        <div className="sm:col-span-3 text-xs font-bold text-foreground">{row.ingredientName}</div>
        <div className="sm:col-span-1 text-xs font-semibold text-foreground text-right">{fmt(row.requiredQuantity)}</div>
        <div className="sm:col-span-1 text-xs text-muted-foreground">{row.unit}</div>
        <div className="sm:col-span-1 text-[11px] text-muted-foreground text-right">{row.vendorsAvailable.length}</div>
        <div className="sm:col-span-2 text-xs text-foreground truncate">{row.recommendedVendorName || '—'}</div>
        <div className="sm:col-span-1 flex items-center">
          <StatusBadge status={row.status} />
        </div>
        <div className="hidden sm:flex sm:col-span-1 justify-end">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border/30 p-3 space-y-3 bg-muted/10">
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 pt-0.5">Reason</span>
            <span className="text-[11px] text-foreground font-medium">{row.reason}</span>
          </div>

          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Vendors Available ({row.vendorsAvailable.length})</div>
            {row.vendorsAvailable.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No Vendor links this ingredient in Vendor Master's Supply Portfolio.</p>
            ) : (
              <div className="space-y-1">
                {row.vendorsAvailable.map((v) => (
                  <div key={v.vendorId} className="flex items-center gap-3 bg-card border border-border/30 rounded-lg px-3 py-1.5">
                    <Star className={`w-3.5 h-3.5 shrink-0 ${v.isPreferred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                    <span className="text-xs font-bold text-foreground flex-1 min-w-0 truncate">{v.vendorName}</span>
                    {v.businessCategory && <span className="text-[10px] text-muted-foreground shrink-0">{v.businessCategory}</span>}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${VENDOR_STATUS_BADGE_CLASS[v.status]}`}>{v.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
