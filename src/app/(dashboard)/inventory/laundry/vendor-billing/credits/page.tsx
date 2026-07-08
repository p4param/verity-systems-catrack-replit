"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Search, ArrowUpRight, ShieldCheck, FileCheck2, Info } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import Link from "next/link";

export default function VendorCreditsPage() {
    const { fetchWithAuth } = useAuth();
    const [credits, setCredits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchCredits = async () => {
        try {
            const data = await fetchWithAuth("/api/inventory/laundry/vendor-billing/credits");
            setCredits(data || []);
        } catch (err) {
            console.error("Failed to load recovery credits:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCredits();
    }, [fetchWithAuth]);

    const filteredCredits = credits.filter(c =>
        c.liability?.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.liability?.apparel?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalCreditsValue = filteredCredits.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const totalRecoveredQty = filteredCredits.reduce((sum, c) => sum + Number(c.quantity || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/laundry/vendor-billing/portal" className="hover:text-foreground hover:underline transition-colors">
                    Billing Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Recovery Credits</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vendor Recovery Credits</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Automated credit notes issued to vendors when previously lost items are recovered.</p>
                </div>
            </div>

            {/* Explanatory Operational Banner */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3 text-sm">
                <Info size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                    <span className="font-bold text-emerald-950 dark:text-emerald-200">Automated Audit Sync:</span> Recovery credits are automatically generated when physical stock recoveries are recorded against vendor-attributed loss movements (`LAUNDRY_VENDOR`). Each credit automatically posts to the vendor financial sub-ledger.
                </div>
            </div>

            {/* Executive Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Total Credit Notes</div>
                    <div className="text-2xl font-bold mt-1">{filteredCredits.length} Notes</div>
                </div>
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Total Assets Recovered</div>
                    <div className="text-2xl font-bold mt-1 text-blue-600">{totalRecoveredQty} Pieces</div>
                </div>
                <div className="bg-card p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
                    <div className="text-xs font-semibold text-emerald-600 uppercase">Total Credit Value Issued</div>
                    <div className="text-2xl font-bold mt-1 text-emerald-600">${totalCreditsValue.toFixed(2)}</div>
                </div>
            </div>

            {/* Table and Filter */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Search by vendor or apparel..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                {loading ? (
                    <div className="py-12 text-center text-muted-foreground animate-pulse">Loading recovery credits...</div>
                ) : filteredCredits.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">No recovery credits recorded.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50/50 dark:bg-slate-900/50">
                                    <th className="py-3 px-4 font-semibold">Credit Note #</th>
                                    <th className="py-3 px-4 font-semibold">Linked Liability</th>
                                    <th className="py-3 px-4 font-semibold">Vendor</th>
                                    <th className="py-3 px-4 font-semibold">Apparel Item</th>
                                    <th className="py-3 px-4 font-semibold">Issue Date</th>
                                    <th className="py-3 px-4 font-semibold text-right">Recovered Qty</th>
                                    <th className="py-3 px-4 font-semibold text-right">Unit Cost</th>
                                    <th className="py-3 px-4 font-semibold text-right">Credit Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredCredits.map((c) => (
                                    <tr key={c.id} className="hover:bg-muted/50/30 transition-colors">
                                        <td className="py-3 px-4 font-bold text-emerald-600 flex items-center gap-1.5">
                                            <FileCheck2 size={16} /> #LVC-{c.id}
                                        </td>
                                        <td className="py-3 px-4 text-xs font-semibold">
                                            <Link href="/inventory/laundry/vendor-billing/liabilities" className="text-primary hover:underline flex items-center gap-1">
                                                #LVL-{c.vendorLiabilityId} <ArrowUpRight size={12} />
                                            </Link>
                                        </td>
                                        <td className="py-3 px-4 font-medium">{c.liability?.vendor?.name}</td>
                                        <td className="py-3 px-4 font-medium">{c.liability?.apparel?.name}</td>
                                        <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                                        <td className="py-3 px-4 text-right font-bold text-blue-600">+{c.quantity}</td>
                                        <td className="py-3 px-4 text-right text-muted-foreground">${Number(c.unitCost).toFixed(2)}</td>
                                        <td className="py-3 px-4 text-right font-bold text-emerald-600">${Number(c.amount).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
