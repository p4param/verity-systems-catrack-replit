"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import Link from "next/link";
import {
    BarChart3,
    Activity,
    Package,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Minus,
    CheckCircle,
    Clock,
    Truck,
    Users,
    Zap,
    RefreshCw,
    Shield,
    Brain,
    Star,
    ArrowUpRight,
    ArrowDownRight,
    ChevronRight,
    Loader2,
    Database,
    ShieldAlert,
    Layers,
    DollarSign,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExecutiveDashboardData {
    snapshotDate: string;
    dataSource: "SNAPSHOT" | "LIVE";
    summary: {
        totalPhysicalInventory: number;
        availableInventory: number;
        reservedInventory: number;
        dirtyInventory: number;
        inLaundryInventory: number;
        inventoryValue: number;
    };
    inventoryHealth: {
        score: number;
        grade: "A" | "B" | "C" | "D" | "F";
        components: {
            availability: number;
            stockoutRisk: number;
            dirtyRatio: number;
            lossRatio: number;
            aging: number;
        };
    };
    demandForecast: {
        predictedDemand30Days: number;
        forecastAccuracy: number;
        predictedPurchaseRequirement: number;
        stockoutRisk: "LOW" | "MEDIUM" | "HIGH";
        note: string;
    };
    eventMetrics: {
        upcomingEvents: number;
        eventsThisMonth: number;
        eventCompletionRate: number;
        eventsPendingReconciliation: number;
    };
    lossMetrics: {
        grossLoss: number;
        recovered: number;
        netLoss: number;
        lossRate: number;
        recoveryRate: number;
        financialImpact: number;
    };
    vendorMetrics: {
        overallScore: number;
        highRiskVendorCount: number;
        averageTurnaroundDays: number;
        vendorLiability: number;
        topVendors: { vendorId: number; vendorName: string; score: number; totalDispatched: number; totalReturned: number; avgTurnaroundDays: number; riskLevel: string }[];
        bottomVendors: { vendorId: number; vendorName: string; score: number; riskLevel: string }[];
    };
    laundryMetrics: {
        dirtyStockQty: number;
        inLaundryQty: number;
        agingBuckets: { within3Days: number; within7Days: number; over7Days: number };
        avgCycleDays: number;
        delayedOrders: number;
    };
    utilizationMetrics: {
        topUtilized: { apparelId: number; apparelName: string; category: string; utilizationRate: number }[];
        underUtilized: { apparelId: number; apparelName: string; category: string; utilizationRate: number }[];
        overallUtilizationRate: number;
    };
    riskMetrics: {
        stockoutRisk: "LOW" | "MEDIUM" | "HIGH";
        vendorRisk: "LOW" | "MEDIUM" | "HIGH";
        laundryBottleneck: "LOW" | "MEDIUM" | "HIGH";
        eventCapacityRisk: "LOW" | "MEDIUM" | "HIGH";
        overallRiskLevel: "LOW" | "MEDIUM" | "HIGH";
    };
    financialMetrics: {
        inventoryValue: number;
        monthlyConsumptionValue: number;
        costOfLosses: number;
        costOfDamages: number;
        recoverySavings: number;
        note: string;
    };
    recommendations: {
        id: string;
        priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
        type: string;
        title: string;
        description: string;
        createdAt: string;
    }[];
}

// ─── Helper Components ────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: "LOW" | "MEDIUM" | "HIGH" }) {
    const configs = {
        LOW: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" },
        MEDIUM: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
        HIGH: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30", dot: "bg-rose-400" },
    };
    const c = configs[level];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />
            {level}
        </span>
    );
}

function PriorityBadge({ priority }: { priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" }) {
    const configs = {
        CRITICAL: { bg: "bg-rose-600", text: "text-foreground" },
        HIGH: { bg: "bg-orange-500", text: "text-foreground" },
        MEDIUM: { bg: "bg-amber-500", text: "text-foreground" },
        LOW: { bg: "bg-slate-600", text: "text-foreground" },
    };
    const c = configs[priority];
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${c.bg} ${c.text}`}>
            {priority}
        </span>
    );
}

function RecommendationTypeIcon({ type }: { type: string }) {
    const icons: Record<string, typeof Brain> = {
        REORDER: Package,
        LAUNDRY: Truck,
        VENDOR: Users,
        LOSS: AlertTriangle,
        CAPACITY: Layers,
        GENERAL: Brain,
    };
    const Icon = icons[type] || Brain;
    return <Icon size={16} />;
}

function HealthGauge({ score, grade }: { score: number; grade: string }) {
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const dash = (score / 100) * circumference;
    const gradeColors: Record<string, string> = {
        A: "#10b981", B: "#3b82f6", C: "#f59e0b", D: "#f97316", F: "#ef4444"
    };
    const color = gradeColors[grade] || "#6b7280";

    return (
        <div className="relative flex items-center justify-center w-36 h-36 mx-auto">
            <svg viewBox="0 0 130 130" className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="65" cy="65" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle
                    cx="65" cy="65" r={radius} fill="none"
                    stroke={color} strokeWidth="10"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 1s ease-in-out" }}
                />
            </svg>
            <div className="text-center z-10">
                <div className="text-3xl font-black" style={{ color }}>{score}</div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Grade {grade}</div>
            </div>
        </div>
    );
}

function SparkBar({ value, max, color = "#3b82f6" }: { value: number; max: number; color?: string }) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
    );
}

function MetricCard({
    label, value, sub, icon: Icon, trend, trendDir, color = "blue"
}: {
    label: string; value: string | number; sub?: string;
    icon: typeof Activity; trend?: string; trendDir?: "up" | "down" | "flat";
    color?: string;
}) {
    const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
        blue: { bg: "from-blue-500/20 to-blue-600/5", icon: "text-blue-400", text: "text-blue-400" },
        emerald: { bg: "from-emerald-500/20 to-emerald-600/5", icon: "text-emerald-400", text: "text-emerald-400" },
        amber: { bg: "from-amber-500/20 to-amber-600/5", icon: "text-amber-400", text: "text-amber-400" },
        rose: { bg: "from-rose-500/20 to-rose-600/5", icon: "text-rose-400", text: "text-rose-400" },
        violet: { bg: "from-violet-500/20 to-violet-600/5", icon: "text-violet-400", text: "text-violet-400" },
        cyan: { bg: "from-cyan-500/20 to-cyan-600/5", icon: "text-cyan-400", text: "text-cyan-400" },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <div className={`relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br ${c.bg} backdrop-blur-sm p-5 hover:border-border transition-all duration-300 group`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-xl bg-muted/30 ${c.icon} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={18} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trendDir === "up" ? "bg-emerald-500/15 text-emerald-400" : trendDir === "down" ? "bg-rose-500/15 text-rose-400" : "bg-muted/40 text-muted-foreground"}`}>
                        {trendDir === "up" ? <ArrowUpRight size={12} /> : trendDir === "down" ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                        {trend}
                    </div>
                )}
            </div>
            <div className="text-2xl font-black text-foreground mb-0.5">{value}</div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{label}</div>
            {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
    );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: typeof Activity; title: string; subtitle?: string }) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-muted/30 text-foreground">
                <Icon size={18} />
            </div>
            <div>
                <h2 className="text-base font-bold text-foreground">{title}</h2>
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
        </div>
    );
}

function GlassPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-border/50 bg-muted/20 backdrop-blur-xl p-6 ${className}`}>
            {children}
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function ExecutiveDashboardPage() {
    const { fetchWithAuth } = useAuth();
    const [data, setData] = useState<ExecutiveDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboard = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError(null);
        try {
            const result = await fetchWithAuth("/api/dashboard/executive");
            setData(result);
            setLastRefreshed(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load dashboard data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fetchWithAuth]);

    useEffect(() => {
        fetchDashboard();
        const interval = setInterval(() => fetchDashboard(true), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchDashboard]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-border/50 flex items-center justify-center">
                        <Loader2 size={28} className="text-violet-400 animate-spin" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-foreground font-semibold">Loading Executive Dashboard</p>
                    <p className="text-muted-foreground/75 text-sm mt-1">Aggregating KPI snapshots...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <AlertTriangle size={32} />
                </div>
                <div className="text-center">
                    <p className="text-foreground font-semibold">Dashboard Error</p>
                    <p className="text-muted-foreground text-sm mt-1">{error}</p>
                </div>
                <button
                    onClick={() => fetchDashboard()}
                    className="px-4 py-2 rounded-xl bg-muted/30 hover:bg-muted/40 border border-border/50 text-foreground text-sm font-medium transition-all"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (!data) return null;

    const { summary, inventoryHealth, eventMetrics, lossMetrics, vendorMetrics, laundryMetrics, riskMetrics, recommendations } = data;

    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/portal" className="hover:text-foreground hover:underline transition-colors">
                    Inventory Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Dashboard</span>
            </div>

            {/* ─── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/30 to-blue-500/30 border border-violet-500/20">
                            <BarChart3 size={18} className="text-violet-300" />
                        </div>
                        <h1 className="text-2xl font-black text-foreground tracking-tight">Executive Dashboard</h1>
                        {data.dataSource === "LIVE" && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                                Live Query
                            </span>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Snapshot: {data.snapshotDate}
                        {lastRefreshed && (
                            <span className="ml-2 text-muted-foreground/60">
                                · Refreshed {lastRefreshed.toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    id="refresh-dashboard"
                    onClick={() => fetchDashboard(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/30 hover:bg-muted/40 border border-border/50 text-foreground hover:text-foreground text-sm font-medium transition-all disabled:opacity-50"
                >
                    <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                    {refreshing ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {/* ─── Section 1: Inventory Summary ───────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                <MetricCard
                    label="Total Physical"
                    value={summary.totalPhysicalInventory.toLocaleString()}
                    sub="Clean + Dirty"
                    icon={Package}
                    color="blue"
                />
                <MetricCard
                    label="Available"
                    value={summary.availableInventory.toLocaleString()}
                    sub="Clean - Reservations"
                    icon={CheckCircle}
                    color="emerald"
                />
                <MetricCard
                    label="Reserved"
                    value={summary.reservedInventory.toLocaleString()}
                    sub="Active reservations"
                    icon={Clock}
                    color="amber"
                />
                <MetricCard
                    label="Dirty Stock"
                    value={summary.dirtyInventory.toLocaleString()}
                    sub="Awaiting laundry"
                    icon={Activity}
                    color="violet"
                />
                <MetricCard
                    label="In Laundry"
                    value={summary.inLaundryInventory.toLocaleString()}
                    sub="At vendor"
                    icon={Truck}
                    color="cyan"
                />
            </div>

            {/* ─── Section 2 + 9: Health Score + Risk ────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Health Score */}
                <GlassPanel>
                    <SectionHeader icon={Activity} title="Inventory Health Score" subtitle="Weighted composite 0–100" />
                    <HealthGauge score={inventoryHealth.score} grade={inventoryHealth.grade} />
                    <div className="mt-6 space-y-3">
                        {[
                            { label: "Availability", value: inventoryHealth.components.availability, weight: "30%", color: "#10b981" },
                            { label: "Stockout Risk", value: inventoryHealth.components.stockoutRisk, weight: "25%", color: "#3b82f6" },
                            { label: "Dirty Ratio", value: inventoryHealth.components.dirtyRatio, weight: "20%", color: "#f59e0b" },
                            { label: "Loss Ratio", value: inventoryHealth.components.lossRatio, weight: "15%", color: "#8b5cf6" },
                            { label: "Aging", value: inventoryHealth.components.aging, weight: "10%", color: "#06b6d4" },
                        ].map((item) => (
                            <div key={item.label}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">{item.label} <span className="text-muted-foreground/60">({item.weight})</span></span>
                                    <span className="text-foreground font-semibold">{item.value}</span>
                                </div>
                                <SparkBar value={item.value} max={100} color={item.color} />
                            </div>
                        ))}
                    </div>
                </GlassPanel>

                {/* Risk Dashboard */}
                <GlassPanel>
                    <SectionHeader icon={ShieldAlert} title="Risk Indicators" subtitle="Operational risk levels" />
                    <div className="space-y-4 mt-2">
                        {[
                            { label: "Stockout Risk", level: riskMetrics.stockoutRisk, desc: "Based on available inventory ratio" },
                            { label: "Vendor Risk", level: riskMetrics.vendorRisk, desc: "Overdue laundry & return rates" },
                            { label: "Laundry Bottleneck", level: riskMetrics.laundryBottleneck, desc: "Delayed order volume" },
                            { label: "Event Capacity Risk", level: riskMetrics.eventCapacityRisk, desc: "Events pending reconciliation" },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                                </div>
                                <RiskBadge level={item.level} />
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Overall Risk</span>
                        <RiskBadge level={riskMetrics.overallRiskLevel} />
                    </div>
                </GlassPanel>

                {/* Event KPIs */}
                <GlassPanel>
                    <SectionHeader icon={Clock} title="Event KPIs" subtitle="This month's event activity" />
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        {[
                            { label: "Upcoming Events", value: eventMetrics.upcomingEvents, color: "text-blue-400" },
                            { label: "This Month", value: eventMetrics.eventsThisMonth, color: "text-emerald-400" },
                            { label: "Completion Rate", value: `${eventMetrics.eventCompletionRate}%`, color: "text-violet-400" },
                            { label: "Pending Reconciliation", value: eventMetrics.eventsPendingReconciliation, color: "text-amber-400" },
                        ].map((item) => (
                            <div key={item.label} className="p-4 rounded-xl bg-muted/20 border border-border/30 text-center">
                                <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
                                <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold leading-tight">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </GlassPanel>
            </div>

            {/* ─── Section 5 + 7: Loss & Recovery + Laundry ──────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Loss & Recovery */}
                <GlassPanel>
                    <SectionHeader icon={AlertTriangle} title="Loss & Recovery" subtitle="Cumulative from event ledger" />
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="text-center p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                            <div className="text-2xl font-black text-rose-400">{lossMetrics.grossLoss}</div>
                            <div className="text-[10px] text-rose-400/70 mt-1 uppercase tracking-wider font-bold">Gross Loss</div>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <div className="text-2xl font-black text-emerald-400">{lossMetrics.recovered}</div>
                            <div className="text-[10px] text-emerald-400/70 mt-1 uppercase tracking-wider font-bold">Recovered</div>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <div className="text-2xl font-black text-amber-400">{lossMetrics.netLoss}</div>
                            <div className="text-[10px] text-amber-400/70 mt-1 uppercase tracking-wider font-bold">Net Loss</div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                            <span className="text-sm text-muted-foreground">Loss Rate</span>
                            <span className="text-sm font-bold text-rose-400">{lossMetrics.lossRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                            <span className="text-sm text-muted-foreground">Recovery Rate</span>
                            <span className="text-sm font-bold text-emerald-400">{lossMetrics.recoveryRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                            <span className="text-sm text-muted-foreground">Financial Impact</span>
                            <span className="text-xs font-semibold text-muted-foreground/75 italic">V2 Feature</span>
                        </div>
                    </div>
                </GlassPanel>

                {/* Laundry Operations */}
                <GlassPanel>
                    <SectionHeader icon={Truck} title="Laundry Operations" subtitle="Active vendor laundry pipeline" />
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <div className="text-2xl font-black text-blue-400">{data.laundryMetrics.inLaundryQty}</div>
                            <div className="text-[10px] text-blue-400/70 mt-1 uppercase tracking-wider font-bold">In Laundry</div>
                        </div>
                        <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                            <div className="text-2xl font-black text-violet-400">{laundryMetrics.dirtyStockQty}</div>
                            <div className="text-[10px] text-violet-400/70 mt-1 uppercase tracking-wider font-bold">Dirty Stock</div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Aging Buckets</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: "0–3 Days", value: laundryMetrics.agingBuckets.within3Days, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                                { label: "4–7 Days", value: laundryMetrics.agingBuckets.within7Days, color: "text-amber-400", bg: "bg-amber-500/10" },
                                { label: ">7 Days", value: laundryMetrics.agingBuckets.over7Days, color: "text-rose-400", bg: "bg-rose-500/10" },
                            ].map((b) => (
                                <div key={b.label} className={`text-center p-3 rounded-xl ${b.bg} border border-border/30`}>
                                    <div className={`text-xl font-black ${b.color}`}>{b.value}</div>
                                    <div className="text-[10px] text-muted-foreground/75 mt-0.5 uppercase tracking-wider">{b.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1 p-3 rounded-xl bg-muted/20 border border-border/30 text-center">
                            <div className="text-lg font-black text-foreground">{laundryMetrics.avgCycleDays}d</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Cycle</div>
                        </div>
                        <div className={`flex-1 p-3 rounded-xl border text-center ${laundryMetrics.delayedOrders > 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-muted/20 border-border/30"}`}>
                            <div className={`text-lg font-black ${laundryMetrics.delayedOrders > 0 ? "text-rose-400" : "text-emerald-400"}`}>{laundryMetrics.delayedOrders}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Delayed</div>
                        </div>
                    </div>
                </GlassPanel>
            </div>

            {/* ─── Section 6: Vendor Performance ──────────────────────────────── */}
            <GlassPanel>
                <div className="flex items-center justify-between mb-5">
                    <SectionHeader icon={Users} title="Vendor Performance" subtitle="Laundry vendor scoring & risk" />
                    <div className="text-right">
                        <div className="text-2xl font-black text-foreground">{vendorMetrics.overallScore}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-widest">Overall Score</div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    <div className="p-4 rounded-xl bg-muted/20 border border-border/30 text-center">
                        <div className="text-2xl font-black text-rose-400">{vendorMetrics.highRiskVendorCount}</div>
                        <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">High Risk Vendors</div>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/20 border border-border/30 text-center">
                        <div className="text-2xl font-black text-blue-400">{vendorMetrics.averageTurnaroundDays}d</div>
                        <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Avg Turnaround</div>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/20 border border-border/30 text-center">
                        <div className="text-2xl font-black text-muted-foreground/75 italic text-sm font-medium mt-1">V2</div>
                        <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Vendor Liability</div>
                    </div>
                </div>

                {vendorMetrics.topVendors.length > 0 && (
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">Top Performing Vendors</p>
                        <div className="space-y-2">
                            {vendorMetrics.topVendors.slice(0, 3).map((v, i) => (
                                <div key={v.vendorId} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 flex items-center justify-center text-xs font-bold text-foreground">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{v.vendorName}</p>
                                        <p className="text-xs text-muted-foreground">{v.totalDispatched} dispatched · {v.totalReturned} returned · {v.avgTurnaroundDays}d avg</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-emerald-400">{v.score}</div>
                                        <RiskBadge level={v.riskLevel as "LOW" | "MEDIUM" | "HIGH"} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </GlassPanel>

            {/* ─── Section 3 + 8 + 10: Demand + Utilization + Financial ──────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Demand Forecast */}
                <GlassPanel>
                    <SectionHeader icon={TrendingUp} title="Demand Forecast" subtitle="V2 — AI/ML module" />
                    <div className="space-y-3">
                        {[
                            { label: "30-Day Predicted Demand", value: "—" },
                            { label: "Forecast Accuracy", value: "—" },
                            { label: "Purchase Requirement", value: "—" },
                            { label: "Stockout Risk Level", value: <RiskBadge level={data.demandForecast.stockoutRisk} /> },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                                <span className="text-sm text-muted-foreground">{item.label}</span>
                                <span className="text-sm font-bold text-muted-foreground/75">{item.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                        <p className="text-xs text-amber-400/70">⚡ {data.demandForecast.note}</p>
                    </div>
                </GlassPanel>

                {/* Asset Utilization */}
                <GlassPanel>
                    <SectionHeader icon={Layers} title="Asset Utilization" subtitle="Allotted vs available per apparel" />
                    {data.utilizationMetrics.topUtilized.length > 0 ? (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Top Utilized</p>
                            {data.utilizationMetrics.topUtilized.map((item) => (
                                <div key={item.apparelId}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-muted-foreground truncate">{item.apparelName}</span>
                                        <span className="text-foreground font-semibold ml-2 shrink-0">{item.utilizationRate}%</span>
                                    </div>
                                    <SparkBar
                                        value={item.utilizationRate}
                                        max={100}
                                        color={item.utilizationRate > 80 ? "#10b981" : item.utilizationRate > 50 ? "#f59e0b" : "#6b7280"}
                                    />
                                </div>
                            ))}
                            <div className="pt-2 border-t border-border/30">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Overall Utilization</span>
                                    <span className="text-foreground font-bold">{data.utilizationMetrics.overallUtilizationRate}%</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                            <Database size={24} className="text-muted-foreground/50 mb-2" />
                            <p className="text-sm text-muted-foreground/75">No utilization data yet.</p>
                            <p className="text-xs text-muted-foreground/50 mt-1">Run the snapshot job to populate.</p>
                        </div>
                    )}
                </GlassPanel>

                {/* Financial KPIs */}
                <GlassPanel>
                    <SectionHeader icon={DollarSign} title="Financial KPIs" subtitle="V2 — Valuation module" />
                    <div className="space-y-3">
                        {[
                            { label: "Inventory Value" },
                            { label: "Monthly Consumption" },
                            { label: "Cost of Losses" },
                            { label: "Cost of Damages" },
                            { label: "Recovery Savings" },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                                <span className="text-sm text-muted-foreground">{item.label}</span>
                                <span className="text-sm font-semibold text-muted-foreground/60 italic">V2</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                        <p className="text-xs text-blue-400/70">💡 {data.financialMetrics.note}</p>
                    </div>
                </GlassPanel>
            </div>

            {/* ─── Section 11: AI Recommendations ──────────────────────────────── */}
            <GlassPanel>
                <div className="flex items-center justify-between mb-5">
                    <SectionHeader icon={Brain} title="AI Recommendations" subtitle="Actionable intelligence from ledger patterns" />
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/20">
                        <Zap size={12} className="text-violet-400" />
                        <span className="text-xs font-semibold text-violet-400">{recommendations.length} Active</span>
                    </div>
                </div>

                {recommendations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
                            <Brain size={24} className="text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground font-medium">No active recommendations</p>
                        <p className="text-muted-foreground/50 text-sm mt-1">The AI engine has no alerts at this time.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {recommendations.map((rec) => (
                            <div
                                key={rec.id}
                                className={`p-4 rounded-xl border transition-all hover:border-border ${rec.priority === "CRITICAL"
                                    ? "bg-rose-500/5 border-rose-500/20"
                                    : rec.priority === "HIGH"
                                        ? "bg-orange-500/5 border-orange-500/20"
                                        : rec.priority === "MEDIUM"
                                            ? "bg-amber-500/5 border-amber-500/15"
                                            : "bg-muted/10 border-border/40"
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${rec.priority === "CRITICAL" ? "bg-rose-500/20 text-rose-400"
                                        : rec.priority === "HIGH" ? "bg-orange-500/20 text-orange-400"
                                            : rec.priority === "MEDIUM" ? "bg-amber-500/20 text-amber-400"
                                                : "bg-muted/30 text-muted-foreground/75"
                                        }`}>
                                        <RecommendationTypeIcon type={rec.type} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <PriorityBadge priority={rec.priority} />
                                            <span className="text-[10px] text-muted-foreground/75 uppercase tracking-widest">{rec.type}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground leading-snug">{rec.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{rec.description}</p>
                                        <p className="text-[10px] text-muted-foreground/50 mt-2">
                                            {new Date(rec.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </GlassPanel>
        </div>
    );
}
