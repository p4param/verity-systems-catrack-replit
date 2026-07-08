"use client";

import { useState, useEffect } from "react";
import { DollarSign, Plus, CheckCircle2, XCircle, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import Link from "next/link";
import CreateRateModal from "./CreateRateModal";

export default function VendorRatesPage() {
    const { fetchWithAuth, user } = useAuth();
    const [rates, setRates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const canCreate = user?.permissions?.includes("LAUNDRY_VENDOR_BILLING_CREATE");

    const fetchRates = async () => {
        try {
            const data = await fetchWithAuth("/api/inventory/laundry/vendor-billing/rates");
            setRates(data || []);
        } catch (err) {
            console.error("Failed to load vendor rates:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRates();
    }, [fetchWithAuth]);

    const filteredRates = rates.filter(r =>
        r.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.apparel?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/laundry/vendor-billing/portal" className="hover:text-foreground hover:underline transition-colors">
                    Billing Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Rate Contracts</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vendor Rate Contracts</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Configure and track washing, ironing, and dry cleaning rates per vendor.</p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all shrink-0"
                    >
                        <Plus size={18} /> New Rate Contract
                    </button>
                )}
            </div>

            {/* Filter and Table */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Search by vendor or apparel name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-muted-foreground animate-pulse">Loading rate contracts...</div>
                ) : filteredRates.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">No rate contracts found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50/50 dark:bg-slate-900/50">
                                    <th className="py-3 px-4 font-semibold">Vendor</th>
                                    <th className="py-3 px-4 font-semibold">Apparel</th>
                                    <th className="py-3 px-4 font-semibold text-right">Washing Rate</th>
                                    <th className="py-3 px-4 font-semibold text-right">Ironing Rate</th>
                                    <th className="py-3 px-4 font-semibold text-right">Dry Cleaning</th>
                                    <th className="py-3 px-4 font-semibold">Effective From</th>
                                    <th className="py-3 px-4 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredRates.map((rate) => (
                                    <tr key={rate.id} className="hover:bg-muted/50/30 transition-colors">
                                        <td className="py-3 px-4 font-medium">{rate.vendor?.name}</td>
                                        <td className="py-3 px-4">{rate.apparel?.name}</td>
                                        <td className="py-3 px-4 text-right font-semibold">${Number(rate.washingRate).toFixed(2)}</td>
                                        <td className="py-3 px-4 text-right text-muted-foreground">{rate.ironingRate ? `$${Number(rate.ironingRate).toFixed(2)}` : '—'}</td>
                                        <td className="py-3 px-4 text-right text-muted-foreground">{rate.dryCleaningRate ? `$${Number(rate.dryCleaningRate).toFixed(2)}` : '—'}</td>
                                        <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(rate.effectiveFrom).toLocaleDateString()}</td>
                                        <td className="py-3 px-4">
                                            {rate.isActive ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                                                    <CheckCircle2 size={12} /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                    <XCircle size={12} /> Inactive
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <CreateRateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaved={fetchRates}
            />
        </div>
    );
}
