"use client";

import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import Link from "next/link";

export default function VendorAgingPage() {
    const { fetchWithAuth } = useAuth();
    const [agingData, setAgingData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAging = async () => {
            try {
                const data = await fetchWithAuth("/api/inventory/laundry/vendor-billing/aging");
                setAgingData(data);
            } catch (err) {
                console.error("Failed to load aging report:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAging();
    }, [fetchWithAuth]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/laundry/vendor-billing/portal" className="hover:text-foreground hover:underline transition-colors">
                    Billing Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Aging Report</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vendor Accounts Payable Aging</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Categorized breakdown of outstanding vendor liabilities across aging buckets.</p>
                </div>
            </div>

            {loading ? (
                <div className="py-12 text-center text-muted-foreground animate-pulse">Computing aging analysis...</div>
            ) : !agingData || agingData.vendors?.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No outstanding vendor balances to report.</div>
            ) : (
                <div className="space-y-6">
                    {/* Summary Buckets */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                            <div className="text-xs font-semibold text-emerald-600 uppercase">Current (0-30 Days)</div>
                            <div className="text-xl font-bold mt-1">${Number(agingData.totals.current).toFixed(2)}</div>
                        </div>
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                            <div className="text-xs font-semibold text-blue-600 uppercase">31 - 60 Days</div>
                            <div className="text-xl font-bold mt-1">${Number(agingData.totals.days31to60).toFixed(2)}</div>
                        </div>
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                            <div className="text-xs font-semibold text-amber-600 uppercase">61 - 90 Days</div>
                            <div className="text-xl font-bold mt-1">${Number(agingData.totals.days61to90).toFixed(2)}</div>
                        </div>
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                            <div className="text-xs font-semibold text-rose-600 uppercase">Over 90 Days</div>
                            <div className="text-xl font-bold mt-1 text-rose-600">${Number(agingData.totals.over90).toFixed(2)}</div>
                        </div>
                        <div className="bg-card p-4 rounded-2xl border border-primary/30 bg-primary/5 shadow-sm col-span-2 md:col-span-1">
                            <div className="text-xs font-semibold text-primary uppercase">Total Payables</div>
                            <div className="text-xl font-bold mt-1 text-primary">${Number(agingData.totals.total).toFixed(2)}</div>
                        </div>
                    </div>

                    {/* Aging Breakdown Table */}
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50/50 dark:bg-slate-900/50">
                                        <th className="py-3 px-4 font-semibold">Vendor Name</th>
                                        <th className="py-3 px-4 font-semibold text-right">0 - 30 Days</th>
                                        <th className="py-3 px-4 font-semibold text-right">31 - 60 Days</th>
                                        <th className="py-3 px-4 font-semibold text-right">61 - 90 Days</th>
                                        <th className="py-3 px-4 font-semibold text-right">90+ Days</th>
                                        <th className="py-3 px-4 font-semibold text-right">Total Outstanding</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {agingData.vendors.map((v: any) => (
                                        <tr key={v.vendorId} className="hover:bg-muted/50/30 transition-colors">
                                            <td className="py-3 px-4 font-bold">{v.vendorName}</td>
                                            <td className="py-3 px-4 text-right font-medium">{v.current > 0 ? `$${Number(v.current).toFixed(2)}` : '—'}</td>
                                            <td className="py-3 px-4 text-right font-medium">{v.days31to60 > 0 ? `$${Number(v.days31to60).toFixed(2)}` : '—'}</td>
                                            <td className="py-3 px-4 text-right font-medium text-amber-600">{v.days61to90 > 0 ? `$${Number(v.days61to90).toFixed(2)}` : '—'}</td>
                                            <td className="py-3 px-4 text-right font-bold text-rose-600">{v.over90 > 0 ? `$${Number(v.over90).toFixed(2)}` : '—'}</td>
                                            <td className="py-3 px-4 text-right font-bold">${Number(v.total).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
