"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Card, StatusBadge } from "@/components/inventory/InventoryUI";
import {
    Truck,
    BarChart3,
    Clock,
    DollarSign,
    RotateCcw,
    FileText,
    Filter,
    Download,
    Calendar,
    Search,
    ChevronRight,
    Loader2
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";

// Report Tabs Configuration
const REPORT_TABS = [
    { id: "exposure", name: "Stock Exposure", icon: Truck },
    { id: "performance", name: "Vendor Scorecard", icon: BarChart3 },
    { id: "aging", name: "Laundry Aging", icon: Clock },
    { id: "liability", name: "Financial Liability", icon: DollarSign },
    { id: "reconciliation", name: "Order Reconcile", icon: FileText },
    { id: "recovery", name: "Recovery Efficiency", icon: RotateCcw }
];

export default function VendorReportsDashboard() {
    const { fetchWithAuth } = useAuth();
    const [activeTab, setActiveTab] = useState("exposure");
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);

    // Filters
    const [filterVendor, setFilterVendor] = useState("");
    const [vendorSearchText, setVendorSearchText] = useState("");
    const [isVendorOpen, setIsVendorOpen] = useState(false);
    const [filterDateStart, setFilterDateStart] = useState("");
    const [filterDateEnd, setFilterDateEnd] = useState("");

    // Fetch Vendors for filter dropdown
    useEffect(() => {
        fetchWithAuth("/api/inventory/vendors").then(res => setVendors(Array.isArray(res) ? res : []));
    }, [fetchWithAuth]);

    // Fetch Report Data
    const fetchReportData = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filterVendor) queryParams.set("vendorId", filterVendor);
            if (filterDateStart) queryParams.set("startDate", filterDateStart);
            if (filterDateEnd) queryParams.set("endDate", filterDateEnd);

            const res = await fetchWithAuth(`/api/inventory/reports/vendors/${activeTab}?${queryParams.toString()}`);
            setData(res);
        } catch (err) {
            console.error("Report Load Error:", err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        setData([]); // Clear old data to prevent mismatch
        setLoading(true);
    };

    useEffect(() => {
        fetchReportData();
    }, [activeTab, filterVendor, filterDateStart, filterDateEnd]);

    const handleExport = async () => {
        try {
            await fetchWithAuth("/api/admin/audit/report-export", {
                method: "POST",
                body: JSON.stringify({
                    reportType: activeTab,
                    filters: { filterVendor, filterDateStart, filterDateEnd }
                })
            });
            toast.success(`${activeTab.toUpperCase()} report export logged and initiated.`);
        } catch (err) {
            console.error("Export Audit Error:", err);
            toast.error("Failed to log export event.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vendor Reporting Hub</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Strategic analytics for laundry vendor performance and liability.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="bg-card border border-border px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-muted/50 transition-colors shadow-sm"
                >
                    <Download size={16} /> Export Detailed Report
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-1.5 relative z-30">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vendor Partner</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                        <input
                            type="text"
                            placeholder="Search vendors..."
                            value={vendorSearchText}
                            onFocus={() => setIsVendorOpen(true)}
                            onChange={(e) => {
                                setVendorSearchText(e.target.value);
                                setIsVendorOpen(true);
                                if (!e.target.value) setFilterVendor("");
                            }}
                            className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                        {isVendorOpen && (
                            <>
                                {/* Backdrop */}
                                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsVendorOpen(false)} />

                                <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto p-1 animate-in fade-in zoom-in duration-200">
                                    <div
                                        className="px-3 py-2 text-xs font-bold text-primary cursor-pointer hover:bg-muted/50 rounded-lg"
                                        onClick={() => {
                                            setFilterVendor("");
                                            setVendorSearchText("");
                                            setIsVendorOpen(false);
                                        }}
                                    >
                                        All Vendors
                                    </div>
                                    {vendors
                                        .filter(v => (v?.name || "").toLowerCase().includes((vendorSearchText || "").toLowerCase()))
                                        .map(v => (
                                            <div
                                                key={v.id}
                                                className="px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 rounded-lg flex items-center justify-between group"
                                                onClick={() => {
                                                    setFilterVendor(v.id.toString());
                                                    setVendorSearchText(v.name);
                                                    setIsVendorOpen(false);
                                                }}
                                            >
                                                <span className="font-medium">{v.name}</span>
                                                <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                                            </div>
                                        ))}
                                    {vendors.length > 0 && vendors.filter(v => (v?.name || "").toLowerCase().includes((vendorSearchText || "").toLowerCase())).length === 0 && (
                                        <div className="px-3 py-4 text-center text-xs text-muted-foreground italic">
                                            No vendors found
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="w-full md:w-44 space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Start Date</label>
                    <input
                        type="date"
                        value={filterDateStart}
                        onChange={(e) => setFilterDateStart(e.target.value)}
                        className="w-full px-4 py-2 bg-muted/50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                </div>
                <div className="w-full md:w-44 space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">End Date</label>
                    <input
                        type="date"
                        value={filterDateEnd}
                        onChange={(e) => setFilterDateEnd(e.target.value)}
                        className="w-full px-4 py-2 bg-muted/50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                </div>
                <button
                    onClick={() => {
                        setFilterVendor("");
                        setVendorSearchText("");
                        setFilterDateStart("");
                        setFilterDateEnd("");
                    }}
                    className="px-4 py-2 text-primary font-bold text-xs uppercase hover:bg-primary/5 rounded-lg transition-colors h-[38px]"
                >
                    Reset
                </button>
            </div>

            {/* Report Tabs */}
            <div className="flex flex-wrap gap-2">
                {REPORT_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border",
                            activeTab === tab.id
                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105"
                                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
                        )}
                    >
                        <tab.icon size={16} />
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-3">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <span className="text-sm font-medium">Aggregating Ledger Data...</span>
                    </div>
                ) : (
                    <ReportGrid type={activeTab} data={data} />
                )}
            </div>
        </div>
    );
}

function ReportGrid({ type, data }: { type: string, data: any[] }) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-card border border-border border-dashed rounded-2xl h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <FileText size={48} className="opacity-10" />
                <p className="text-sm italic">No data matched your criteria for this report.</p>
            </div>
        );
    }

    // Dynamic columns based on type
    return (
        <Card className="p-0 overflow-hidden border-border bg-card shadow-xl ">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-muted/50 border-b border-border">
                            {type === "exposure" && (
                                <>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vendor</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Apparel</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dispatched</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Returned</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Missing</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Net With Vendor</th>
                                </>
                            )}
                            {type === "performance" && (
                                <>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vendor Partner</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Units</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Missing</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Damaged</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Loss Rate %</th>
                                </>
                            )}
                            {type === "aging" && (
                                <>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vendor</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Asset</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sent Date</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Days Out</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Risk Level</th>
                                </>
                            )}
                            {type === "liability" && (
                                <>
                                    <th className="p-4 text-[10px) font-black uppercase tracking-widest text-muted-foreground">Vendor</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Asset</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Net Loss Qty</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unit Value</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Liability Amb</th>
                                </>
                            )}
                            {type === "reconciliation" && (
                                <>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order ID</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vendor</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dispatch Date</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Reconciled %</th>
                                </>
                            )}
                            {type === "recovery" && (
                                <>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vendor Partner</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lost Qty</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recovered Qty</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Recovery Rate %</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {data.map((item, idx) => (
                            <tr key={idx} className="hover:bg-muted/50 transition-colors">
                                {type === "exposure" && (
                                    <>
                                        <td className="p-4 font-bold text-sm">{item.vendorName}</td>
                                        <td className="p-4 text-sm font-medium">{item.apparelName}</td>
                                        <td className="p-4 text-sm">{item.dispatched}</td>
                                        <td className="p-4 text-sm">{item.returned}</td>
                                        <td className="p-4 text-sm text-rose-600 font-bold">{item.missing}</td>
                                        <td className="p-4 text-sm text-right font-black text-primary">{item.netWithVendor}</td>
                                    </>
                                )}
                                {type === "performance" && (
                                    <>
                                        <td className="p-4 font-bold text-sm">{item.vendorName}</td>
                                        <td className="p-4 text-sm">{item.totalDispatched}</td>
                                        <td className="p-4 text-sm">{item.totalMissing}</td>
                                        <td className="p-4 text-sm">{item.totalDamaged}</td>
                                        <td className="p-4 text-sm text-right font-black">
                                            <StatusBadge type={item.lossRate > 5 ? "danger" : item.lossRate > 2 ? "warning" : "success"}>
                                                {(item.lossRate || 0).toFixed(2)}%
                                            </StatusBadge>
                                        </td>
                                    </>
                                )}
                                {type === "aging" && (
                                    <>
                                        <td className="p-4 font-bold text-sm">{item.vendorName}</td>
                                        <td className="p-4 text-sm">{item.apparelName}</td>
                                        <td className="p-4 text-sm">{item.dispatchDate ? new Date(item.dispatchDate).toLocaleDateString() : 'N/A'}</td>
                                        <td className="p-4 text-sm font-bold">{item.daysInLaundry} days</td>
                                        <td className="p-4 text-sm text-right">
                                            <StatusBadge type={item.riskLevel === "CRITICAL" ? "danger" : item.riskLevel === "WARNING" ? "warning" : "neutral"}>
                                                {item.riskLevel}
                                            </StatusBadge>
                                        </td>
                                    </>
                                )}
                                {type === "liability" && (
                                    <>
                                        <td className="p-4 font-bold text-sm">{item.vendorName}</td>
                                        <td className="p-4 text-sm">{item.apparelName}</td>
                                        <td className="p-4 text-sm font-bold">{item.netLoss || 0}</td>
                                        <td className="p-4 text-sm">${(item.unitValue || 0).toFixed(2)}</td>
                                        <td className="p-4 text-sm text-right font-black text-rose-700">${(item.liabilityAmount || 0).toFixed(2)}</td>
                                    </>
                                )}
                                {type === "reconciliation" && (
                                    <>
                                        <td className="p-4 text-sm font-bold text-primary">LO#{item.id}</td>
                                        <td className="p-4 text-sm font-medium">{item.vendorName}</td>
                                        <td className="p-4 text-sm">{item.dispatchDate ? new Date(item.dispatchDate).toLocaleDateString() : 'N/A'}</td>
                                        <td className="p-4 text-sm">
                                            <StatusBadge type={item.status === "CLOSED" ? "success" : "warning"}>
                                                {item.status || 'UNKNOWN'}
                                            </StatusBadge>
                                        </td>
                                        <td className="p-4 text-sm text-right font-bold">
                                            {item.status === "CLOSED" ? "100%" : "Partial"}
                                        </td>
                                    </>
                                )}
                                {type === "recovery" && (
                                    <>
                                        <td className="p-4 font-bold text-sm">{item.vendorName}</td>
                                        <td className="p-4 text-sm">{(Number(item.totalMissing || 0) + Number(item.totalDamaged || 0))}</td>
                                        <td className="p-4 text-sm">{item.totalRecovered || 0}</td>
                                        <td className="p-4 text-sm text-right font-black">
                                            <StatusBadge type={item.recoveryRate > 80 ? "success" : item.recoveryRate > 50 ? "info" : "warning"}>
                                                {(item.recoveryRate || 0).toFixed(1)}%
                                            </StatusBadge>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
