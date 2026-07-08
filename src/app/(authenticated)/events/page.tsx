"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Download, Upload, Calendar, BarChart3, BookmarkPlus,
  Search, Filter, X, ChevronDown, RefreshCw, MoreHorizontal,
  Eye, Pencil, Copy, Ban, Archive, Printer, Share2,
  FileText, Receipt, CheckSquare, Square, AlertTriangle,
  TrendingUp, Clock, DollarSign, Users, Activity,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  useEvents,
  useDashboardCards,
  useEventFilters,
  useBulkUpdate,
  useExportEvents,
  useDebounce,
  EventListFilters,
} from "@/modules/events/hooks";

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
  loading?: boolean;
}

function KpiCard({ label, value, icon: Icon, color, onClick, loading }: KpiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-card border rounded-xl p-4 flex items-center gap-4 text-left w-full hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground font-medium truncate">{label}</div>
        {loading ? (
          <div className="h-6 w-16 rounded bg-muted animate-pulse mt-1" />
        ) : (
          <div className="text-2xl font-bold leading-tight text-foreground">{value}</div>
        )}
      </div>
    </button>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: { name: string; code: string } | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;

  const colors: Record<string, string> = {
    CANCELLED: "bg-red-100 text-red-700 border-red-200",
    COMPLETED: "bg-green-100 text-green-700 border-green-200",
    CONFIRMED: "bg-blue-100 text-blue-700 border-blue-200",
    TENTATIVE: "bg-yellow-100 text-yellow-700 border-yellow-200",
    INQUIRY: "bg-gray-100 text-gray-700 border-gray-200",
    PLANNING: "bg-purple-100 text-purple-700 border-purple-200",
    PRODUCTION: "bg-orange-100 text-orange-700 border-orange-200",
    OVERDUE: "bg-rose-100 text-rose-700 border-rose-200",
  };

  const cls = colors[status.code?.toUpperCase()] || "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status.name}
    </span>
  );
}

// ─── Row Color ────────────────────────────────────────────────────────────────

function rowClass(event: any): string {
  const code = event.status?.code?.toUpperCase();
  if (code === "CANCELLED") return "bg-red-50 dark:bg-red-950/20 hover:bg-red-100";
  if (code === "COMPLETED") return "bg-green-50 dark:bg-green-950/20 hover:bg-green-100";
  if (code === "TENTATIVE") return "bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100";

  const now = new Date();
  const invoice = Number(event.costing?.invoiceTotal ?? event.budgetAmount ?? 0);
  const paid = Number(event.costing?.amountPaid ?? 0);
  const balance = invoice - paid;
  const isPast = new Date(event.endDate) < now;

  if (balance > 0 && isPast) return "bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100"; // Overdue
  if (balance > 0) return "bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100"; // Pending payment

  return "hover:bg-muted/40 transition-colors";
}

// ─── Row Action Menu ───────────────────────────────────────────────────────────

function RowActions({ event, onAction }: { event: any; onAction: (action: string, event: any) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const actions = [
    { key: "open", label: "Open", icon: Eye },
    { key: "edit", label: "Edit", icon: Pencil },
    { key: "duplicate", label: "Duplicate", icon: Copy },
    { key: "divider1", label: "", icon: null },
    { key: "cancel", label: "Cancel", icon: Ban },
    { key: "archive", label: "Archive", icon: Archive },
    { key: "divider2", label: "", icon: null },
    { key: "print", label: "Print", icon: Printer },
    { key: "share", label: "Share", icon: Share2 },
    { key: "divider3", label: "", icon: null },
    { key: "proposal", label: "Generate Proposal", icon: FileText },
    { key: "invoice", label: "Generate Invoice", icon: Receipt },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Row actions"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-xl w-48 py-1 text-sm">
          {actions.map((a) => {
            if (a.label === "") return <div key={a.key} className="border-t my-1" />;
            const Icon = a.icon!;
            return (
              <button
                key={a.key}
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(false); onAction(a.key, event); }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-muted text-left transition-colors"
              >
                <Icon size={14} className="text-muted-foreground shrink-0" />
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Column Sort Header ────────────────────────────────────────────────────────

function SortHeader({
  label, field, currentField, currentDir, onSort,
}: {
  label: string; field: string; currentField?: string; currentDir?: string;
  onSort: (field: string) => void;
}) {
  const isActive = currentField === field;
  const isAsc = isActive && currentDir === "asc";

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="flex items-center gap-1 font-semibold text-xs uppercase tracking-wider hover:text-primary transition-colors"
    >
      {label}
      {isActive ? (
        isAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />
      ) : (
        <ArrowUpDown size={12} className="opacity-40" />
      )}
    </button>
  );
}

// ─── Saved Views Sidebar ───────────────────────────────────────────────────────

const SAVED_VIEWS = [
  { id: "all", label: "All Events", filter: {} },
  { id: "my", label: "My Events", filter: { managerId: "me" } },
  { id: "today", label: "Today's Events", filter: { startDateFrom: new Date().toISOString().split("T")[0], startDateTo: new Date().toISOString().split("T")[0] } },
  { id: "upcoming", label: "Upcoming Events", filter: { startDateFrom: new Date().toISOString().split("T")[0] } },
  { id: "pending", label: "Pending Payments", filter: {} },
  { id: "overdue", label: "Overdue Events", filter: {} },
  { id: "cancelled", label: "Cancelled", filter: { statusId: "CANCELLED" } },
  { id: "completed", label: "Completed", filter: { statusId: "COMPLETED" } },
  { id: "archived", label: "Archived", filter: {} },
];

// ─── Main Events Page ──────────────────────────────────────────────────────────

export default function EventsPage() {
  const router = useRouter();

  // Filter state
  const [filters, setFilters] = useState<EventListFilters>({ page: 1, limit: 50, sortField: "startDate", sortDir: "desc" });
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [showFilters, setShowFilters] = useState(false);
  const [activeView, setActiveView] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const bulkRef = useRef<HTMLDivElement>(null);

  // Merge debounced search into filters
  const effectiveFilters = useMemo(() => ({
    ...filters,
    query: debouncedSearch || undefined,
  }), [filters, debouncedSearch]);

  // Queries
  const { data, isLoading, isFetching, error, refetch } = useEvents(effectiveFilters);
  const { data: kpis, isLoading: kpisLoading } = useDashboardCards();
  const { data: filterOptions } = useEventFilters();
  const bulkUpdate = useBulkUpdate();
  const exportEvents = useExportEvents();

  const events = data?.events ?? [];
  const pagination = data?.pagination;

  // Close bulk menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bulkRef.current && !bulkRef.current.contains(e.target as Node)) setShowBulkMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Selection
  const allSelected = events.length > 0 && selectedIds.size === events.length;
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(events.map((e: any) => e.id)));
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Sort
  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortField: field,
      sortDir: prev.sortField === field && prev.sortDir === "desc" ? "asc" : "desc",
      page: 1,
    }));
  };

  // Pagination
  const goPage = (p: number) => setFilters((prev) => ({ ...prev, page: p }));

  // Row actions
  const handleRowAction = useCallback((action: string, event: any) => {
    if (action === "open") router.push(`/events/${event.id}`);
    else if (action === "edit") router.push(`/events/${event.id}/edit`);
    else if (action === "duplicate") router.push(`/events/new?duplicateFrom=${event.id}`);
    else if (action === "cancel") bulkUpdate.mutate({ ids: [event.id], action: "change_status", payload: { statusId: "CANCELLED" } });
    else if (action === "archive") bulkUpdate.mutate({ ids: [event.id], action: "archive" });
    else if (action === "invoice") router.push(`/events/${event.id}/invoice`);
    else if (action === "proposal") router.push(`/events/${event.id}/proposal`);
  }, [router, bulkUpdate]);

  // KPI filter shortcuts
  const applyKpiFilter = (partial: Partial<EventListFilters>) => {
    setFilters({ page: 1, limit: 50, sortField: "startDate", sortDir: "desc", ...partial });
    setSelectedIds(new Set());
  };

  const formatCurrency = (val: number | undefined) => {
    if (!val) return "—";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 sm:p-6 space-y-4">

          {/* Page Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Events</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {pagination ? `${pagination.total.toLocaleString()} events` : "Catering & Event Management"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-2 rounded-md border hover:bg-muted transition-colors text-muted-foreground"
                title="Refresh"
              >
                <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
              </button>
              <button type="button" onClick={() => router.push("/events/calendar")} className="flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm hover:bg-muted transition-colors">
                <Calendar size={15} /> Calendar
              </button>
              <button type="button" onClick={() => router.push("/events/reports")} className="flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm hover:bg-muted transition-colors">
                <BarChart3 size={15} /> Reports
              </button>
              <button
                type="button"
                onClick={() => exportEvents.mutate({ format: "csv" })}
                disabled={exportEvents.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm hover:bg-muted transition-colors"
              >
                <Download size={15} /> Export
              </button>
              <Link
                href="/events/new"
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus size={15} /> New Event
              </Link>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <KpiCard
              label="Total Events" value={kpis?.totalEvents ?? "—"} icon={Activity} color="bg-indigo-500"
              loading={kpisLoading} onClick={() => applyKpiFilter({})}
            />
            <KpiCard
              label="Today" value={kpis?.todayEvents ?? "—"} icon={Clock} color="bg-blue-500"
              loading={kpisLoading}
              onClick={() => applyKpiFilter({ startDateFrom: new Date().toISOString().split("T")[0], startDateTo: new Date().toISOString().split("T")[0] })}
            />
            <KpiCard
              label="Upcoming" value={kpis?.upcomingEvents ?? "—"} icon={TrendingUp} color="bg-cyan-500"
              loading={kpisLoading}
              onClick={() => applyKpiFilter({ startDateFrom: new Date().toISOString().split("T")[0] })}
            />
            <KpiCard
              label="Revenue (Month)" value={formatCurrency(kpis?.revenueThisMonth)} icon={DollarSign} color="bg-emerald-500"
              loading={kpisLoading} onClick={() => applyKpiFilter({})}
            />
            <KpiCard
              label="Pending Payments" value={formatCurrency(kpis?.pendingPayments)} icon={Receipt} color="bg-amber-500"
              loading={kpisLoading} onClick={() => applyKpiFilter({})}
            />
            <KpiCard
              label="Overdue" value={formatCurrency(kpis?.overduePayments)} icon={AlertTriangle} color="bg-rose-500"
              loading={kpisLoading} onClick={() => applyKpiFilter({})}
            />
            <KpiCard
              label="Need Attention" value={kpis?.eventsRequiringAttention ?? "—"} icon={AlertTriangle} color="bg-orange-500"
              loading={kpisLoading} onClick={() => applyKpiFilter({})}
            />
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Views Dropdown */}
            <div className="relative">
              <select
                value={activeView}
                onChange={(e) => {
                  const v = SAVED_VIEWS.find((sv) => sv.id === e.target.value);
                  if (!v) return;
                  setActiveView(v.id);
                  setFilters({ page: 1, limit: 50, sortField: "startDate", sortDir: "desc", ...v.filter });
                  setSelectedIds(new Set());
                }}
                className="pl-3 pr-8 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
              >
                {SAVED_VIEWS.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>

            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                placeholder="Search events, customers, venues…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm transition-colors ${showFilters ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <Filter size={14} />
              Filters
              {Object.keys(filters).filter(k => !["page","limit","sortField","sortDir"].includes(k) && (filters as any)[k]).length > 0 && (
                <span className="ml-1 rounded-full bg-white/30 text-xs px-1.5">{Object.keys(filters).filter(k => !["page","limit","sortField","sortDir"].includes(k) && (filters as any)[k]).length}</span>
              )}
            </button>

            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <div className="relative" ref={bulkRef}>
                <button
                  type="button"
                  onClick={() => setShowBulkMenu(!showBulkMenu)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm bg-primary text-primary-foreground"
                >
                  {selectedIds.size} selected <ChevronDown size={14} />
                </button>
                {showBulkMenu && (
                  <div className="absolute top-full mt-1 left-0 z-50 bg-popover border rounded-lg shadow-xl w-52 py-1 text-sm">
                    {[
                      { key: "export", label: "Export Selected", icon: Download },
                      { key: "archive", label: "Archive Selected", icon: Archive },
                      { key: "delete", label: "Delete Selected", icon: Ban },
                    ].map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => {
                          setShowBulkMenu(false);
                          if (a.key === "export") exportEvents.mutate({ ids: Array.from(selectedIds), format: "csv" });
                          else if (a.key === "archive") bulkUpdate.mutate({ ids: Array.from(selectedIds), action: "archive" });
                          else if (a.key === "delete") bulkUpdate.mutate({ ids: Array.from(selectedIds), action: "delete" });
                          setSelectedIds(new Set());
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-muted transition-colors"
                      >
                        <a.icon size={14} className="text-muted-foreground" /> {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reset filters */}
            {(searchInput || Object.keys(filters).some(k => !["page","limit","sortField","sortDir"].includes(k) && (filters as any)[k])) && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); setFilters({ page: 1, limit: 50, sortField: "startDate", sortDir: "desc" }); }}
                className="flex items-center gap-1 px-2 py-2 text-xs rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={13} /> Clear
              </button>
            )}
          </div>

          {/* Advanced Filter Panel */}
          {showFilters && (
            <div className="border rounded-xl bg-card p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
                <select
                  className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  value={filters.statusId || ""}
                  onChange={(e) => setFilters((p) => ({ ...p, statusId: e.target.value || undefined, page: 1 }))}
                >
                  <option value="">All Statuses</option>
                  {filterOptions?.statuses.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Type</label>
                <select
                  className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  value={filters.typeId || ""}
                  onChange={(e) => setFilters((p) => ({ ...p, typeId: e.target.value || undefined, page: 1 }))}
                >
                  <option value="">All Types</option>
                  {filterOptions?.types.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Event Date From</label>
                <input
                  type="date"
                  className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  value={filters.startDateFrom || ""}
                  onChange={(e) => setFilters((p) => ({ ...p, startDateFrom: e.target.value || undefined, page: 1 }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Event Date To</label>
                <input
                  type="date"
                  className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  value={filters.startDateTo || ""}
                  onChange={(e) => setFilters((p) => ({ ...p, startDateTo: e.target.value || undefined, page: 1 }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Rows Per Page</label>
                <select
                  className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  value={filters.limit || 50}
                  onChange={(e) => setFilters((p) => ({ ...p, limit: Number(e.target.value), page: 1 }))}
                >
                  {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n} rows</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="border border-destructive/40 bg-destructive/10 text-destructive rounded-lg p-4 flex items-center gap-2 text-sm">
              <AlertTriangle size={16} />
              Failed to load events. <button className="underline" onClick={() => refetch()}>Retry</button>
            </div>
          )}

          {/* Data Grid */}
          <div className="border rounded-xl overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="w-10 px-3 py-3 text-left">
                      <button type="button" onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
                        {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </th>
                    <th className="px-3 py-3 text-left whitespace-nowrap">
                      <SortHeader label="Event No" field="eventNumber" currentField={filters.sortField} currentDir={filters.sortDir} onSort={handleSort} />
                    </th>
                    <th className="px-3 py-3 text-left">Status</th>
                    <th className="px-3 py-3 text-left whitespace-nowrap">
                      <SortHeader label="Date" field="startDate" currentField={filters.sortField} currentDir={filters.sortDir} onSort={handleSort} />
                    </th>
                    <th className="px-3 py-3 text-left">Day</th>
                    <th className="px-3 py-3 text-left">
                      <SortHeader label="Event Name" field="name" currentField={filters.sortField} currentDir={filters.sortDir} onSort={handleSort} />
                    </th>
                    <th className="px-3 py-3 text-left">Type</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">Pax</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">
                      <SortHeader label="Revenue" field="budgetAmount" currentField={filters.sortField} currentDir={filters.sortDir} onSort={handleSort} />
                    </th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">Paid</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">Balance</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Health</th>
                    <th className="px-3 py-3 text-left whitespace-nowrap">
                      <SortHeader label="Created" field="createdAt" currentField={filters.sortField} currentDir={filters.sortDir} onSort={handleSort} />
                    </th>
                    <th className="w-10 px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 14 }).map((__, j) => (
                          <td key={j} className="px-3 py-3">
                            <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${40 + Math.random() * 60}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-16 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <Activity size={40} className="opacity-30" />
                          <div>
                            <p className="font-medium">No events found</p>
                            <p className="text-xs mt-1">Try adjusting your filters or create a new event.</p>
                          </div>
                          <Link href="/events/new" className="mt-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                            + New Event
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    events.map((event: any) => {
                      const isSelected = selectedIds.has(event.id);
                      const invoice = Number(event.costing?.invoiceTotal ?? event.budgetAmount ?? 0);
                      const paid = Number(event.costing?.amountPaid ?? 0);
                      const balance = invoice - paid;
                      const health = event.healthScores?.[0]?.score;
                      const startDate = new Date(event.startDate);
                      const dayName = startDate.toLocaleDateString("en-US", { weekday: "short" });

                      return (
                        <tr
                          key={event.id}
                          className={`${rowClass(event)} ${isSelected ? "ring-1 ring-inset ring-primary" : ""} cursor-pointer`}
                          onClick={() => router.push(`/events/${event.id}`)}
                        >
                          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <button type="button" onClick={() => toggleOne(event.id)} className="text-muted-foreground hover:text-foreground">
                              {isSelected ? <CheckSquare size={15} className="text-primary" /> : <Square size={15} />}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs font-medium text-primary whitespace-nowrap">
                            {event.eventNumber}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <StatusBadge status={event.status} />
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                            {startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{dayName}</td>
                          <td className="px-3 py-2.5 font-medium max-w-[200px] truncate" title={event.name}>
                            {event.name}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {event.type?.name ?? "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs">{event.guestCount}</td>
                          <td className="px-3 py-2.5 text-right text-xs font-medium tabular-nums">
                            {formatCurrency(invoice)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-emerald-600 tabular-nums">
                            {formatCurrency(paid)}
                          </td>
                          <td className={`px-3 py-2.5 text-right text-xs font-medium tabular-nums ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            {formatCurrency(balance)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {health !== undefined ? (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${
                                health >= 80 ? "bg-green-100 text-green-700" :
                                health >= 60 ? "bg-yellow-100 text-yellow-700" :
                                "bg-red-100 text-red-700"
                              }`}>
                                {health}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(event.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                          </td>
                          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <RowActions event={event} onAction={handleRowAction} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="border-t px-4 py-3 flex items-center justify-between gap-4 bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} events
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!pagination.hasPrev}
                    onClick={() => goPage(pagination.page - 1)}
                    className="p-1.5 rounded border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (pagination.totalPages > 5) {
                      const start = Math.max(1, pagination.page - 2);
                      pageNum = start + i;
                      if (pageNum > pagination.totalPages) return null;
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => goPage(pageNum)}
                        className={`w-8 h-8 rounded border text-xs font-medium transition-colors ${
                          pageNum === pagination.page
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={!pagination.hasNext}
                    onClick={() => goPage(pagination.page + 1)}
                    className="p-1.5 rounded border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
    </div>
  );
}
