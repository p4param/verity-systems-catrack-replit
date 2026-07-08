"use client";

import { useState, useEffect } from "react";
import { FileSpreadsheet, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import Link from "next/link";

export default function VendorStatementsPage() {
    const { fetchWithAuth } = useAuth();
    const [vendors, setVendors] = useState<any[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState<string>("");
    const [statement, setStatement] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                const data = await fetchWithAuth("/api/inventory/vendors");
                setVendors(data || []);
                if (data && data.length > 0) {
                    setSelectedVendorId(data[0].id.toString());
                }
            } catch (err) {
                console.error("Failed to fetch vendors:", err);
            }
        };
        fetchVendors();
    }, [fetchWithAuth]);

    useEffect(() => {
        if (!selectedVendorId) return;
        const fetchStatement = async () => {
            setLoading(true);
            try {
                const data = await fetchWithAuth(`/api/inventory/laundry/vendor-billing/vendors/${selectedVendorId}/statement`);
                setStatement(data);
            } catch (err) {
                console.error("Failed to load statement:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStatement();
    }, [selectedVendorId, fetchWithAuth]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/laundry/vendor-billing/portal" className="hover:text-foreground hover:underline transition-colors">
                    Billing Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Vendor Statements</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vendor Statement of Account</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Chronological financial sub-ledger statement with running balances.</p>
                </div>
                <div className="flex items-center gap-2 bg-card border border-border p-1.5 rounded-xl shadow-sm">
                    <Building2 size={18} className="text-muted-foreground ml-2" />
                    <select
                        value={selectedVendorId}
                        onChange={(e) => setSelectedVendorId(e.target.value)}
                        className="bg-transparent text-sm font-semibold focus:outline-none pr-4 py-1"
                    >
                        {vendors.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="py-12 text-center text-muted-foreground animate-pulse">Generating financial statement...</div>
            ) : !statement ? (
                <div className="py-12 text-center text-muted-foreground">Select a vendor to view statement.</div>
            ) : (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                            <div className="text-xs font-semibold text-muted-foreground uppercase">Opening Balance</div>
                            <div className="text-2xl font-bold mt-1">${Number(statement.openingBalance).toFixed(2)}</div>
                        </div>
                        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                            <div className="text-xs font-semibold text-muted-foreground uppercase">Total Transactions</div>
                            <div className="text-2xl font-bold mt-1">{statement.transactions.length} entries</div>
                        </div>
                        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm bg-primary/5 border-primary/20">
                            <div className="text-xs font-semibold text-primary uppercase">Closing Outstanding Balance</div>
                            <div className="text-2xl font-bold mt-1 text-primary">${Number(statement.closingBalance).toFixed(2)}</div>
                        </div>
                    </div>

                    {/* Statement Ledger Table */}
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50/50 dark:bg-slate-900/50">
                                        <th className="py-3 px-4 font-semibold">Date</th>
                                        <th className="py-3 px-4 font-semibold">Transaction Type</th>
                                        <th className="py-3 px-4 font-semibold">Reference</th>
                                        <th className="py-3 px-4 font-semibold text-right">Debit ($)</th>
                                        <th className="py-3 px-4 font-semibold text-right">Credit ($)</th>
                                        <th className="py-3 px-4 font-semibold text-right">Running Balance ($)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {statement.transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-muted-foreground">No financial transactions recorded for this vendor.</td>
                                        </tr>
                                    ) : (
                                        statement.transactions.map((t: any) => (
                                            <tr key={t.id} className="hover:bg-muted/50/30 transition-colors">
                                                <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(t.transactionDate).toLocaleDateString()}</td>
                                                <td className="py-3 px-4 font-semibold text-xs">
                                                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{t.transactionType}</span>
                                                </td>
                                                <td className="py-3 px-4 text-xs text-muted-foreground">{t.remarks || `${t.referenceType} #${t.referenceId}`}</td>
                                                <td className="py-3 px-4 text-right font-medium">{t.debit > 0 ? `$${Number(t.debit).toFixed(2)}` : '—'}</td>
                                                <td className="py-3 px-4 text-right font-medium text-emerald-600">{t.credit > 0 ? `$${Number(t.credit).toFixed(2)}` : '—'}</td>
                                                <td className="py-3 px-4 text-right font-bold">${Number(t.runningBalance).toFixed(2)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
