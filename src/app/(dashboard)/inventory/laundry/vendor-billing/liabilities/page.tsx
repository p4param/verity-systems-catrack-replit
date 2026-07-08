"use client";

import { useState, useEffect } from "react";
import { Scale, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import Link from "next/link";

export default function VendorLiabilitiesPage() {
    const { fetchWithAuth } = useAuth();
    const [liabilities, setLiabilities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchLiabilities = async () => {
        try {
            const data = await fetchWithAuth("/api/inventory/laundry/vendor-billing/liabilities");
            setLiabilities(data || []);
        } catch (err) {
            console.error("Failed to load vendor liabilities:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLiabilities();
    }, [fetchWithAuth]);

    const handleWaive = async (id: number) => {
        const remarks = prompt("Enter reason for waiving this liability:");
        if (!remarks) return;
        try {
            await fetchWithAuth(`/api/inventory/laundry/vendor-billing/liabilities/${id}/waive`, {
                method: "POST",
                body: JSON.stringify({ remarks }),
            });
            fetchLiabilities();
        } catch (err) {
            alert("Failed to waive liability: " + (err instanceof Error ? err.message : "Error"));
        }
    };

    const filteredLiabilities = liabilities.filter(l =>
        l.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.apparel?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/laundry/vendor-billing/portal" className="hover:text-foreground hover:underline transition-colors">
                    Billing Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Loss Liabilities</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vendor Loss Liabilities</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Monitor damage and missing asset financial liabilities charged to vendors.</p>
                </div>
            </div>

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
                    <div className="py-12 text-center text-muted-foreground animate-pulse">Loading liabilities...</div>
                ) : filteredLiabilities.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">No vendor liabilities recorded.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50/50 dark:bg-slate-900/50">
                                    <th className="py-3 px-4 font-semibold">Vendor</th>
                                    <th className="py-3 px-4 font-semibold">Apparel</th>
                                    <th className="py-3 px-4 font-semibold">Type</th>
                                    <th className="py-3 px-4 font-semibold text-right">Qty</th>
                                    <th className="py-3 px-4 font-semibold text-right">Unit Cost</th>
                                    <th className="py-3 px-4 font-semibold text-right">Gross Amount</th>
                                    <th className="py-3 px-4 font-semibold text-right">Settled / Credited</th>
                                    <th className="py-3 px-4 font-semibold">Status</th>
                                    <th className="py-3 px-4 font-semibold text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredLiabilities.map((l) => (
                                    <tr key={l.id} className="hover:bg-muted/50/30 transition-colors">
                                        <td className="py-3 px-4 font-bold">{l.vendor?.name}</td>
                                        <td className="py-3 px-4 font-medium">{l.apparel?.name}</td>
                                        <td className="py-3 px-4 text-xs font-semibold">{l.movementTypeCode}</td>
                                        <td className="py-3 px-4 text-right">{l.quantity}</td>
                                        <td className="py-3 px-4 text-right text-muted-foreground">${Number(l.unitCost).toFixed(2)}</td>
                                        <td className="py-3 px-4 text-right font-bold text-rose-600">${Number(l.amount).toFixed(2)}</td>
                                        <td className="py-3 px-4 text-right text-emerald-600 font-semibold">${Number(l.settledAmount).toFixed(2)}</td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
                                                l.status === 'CREDITED' || l.status === 'SETTLED' ? 'text-emerald-700 bg-emerald-100' :
                                                l.status === 'OPEN' ? 'text-rose-700 bg-rose-100' : 'text-slate-700 bg-slate-100'
                                            }`}>
                                                {l.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {l.status === 'OPEN' && (
                                                <button
                                                    onClick={() => handleWaive(l.id)}
                                                    className="px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-all"
                                                >
                                                    Waive
                                                </button>
                                            )}
                                        </td>
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
