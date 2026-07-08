"use client";

import { useState, useEffect } from "react";
import { CreditCard, Plus, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import Link from "next/link";
import CreatePaymentModal from "./CreatePaymentModal";

export default function VendorPaymentsPage() {
    const { fetchWithAuth, user } = useAuth();
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const canCreate = user?.permissions?.includes("LAUNDRY_VENDOR_PAYMENT_CREATE");

    const fetchPayments = async () => {
        try {
            const data = await fetchWithAuth("/api/inventory/laundry/vendor-billing/payments");
            setPayments(data || []);
        } catch (err) {
            console.error("Failed to load vendor payments:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, [fetchWithAuth]);

    const handlePost = async (id: number) => {
        if (!confirm("Are you sure you want to post this payment? Credit entries will be recorded.")) return;
        try {
            await fetchWithAuth(`/api/inventory/laundry/vendor-billing/payments/${id}/post`, { method: "POST" });
            fetchPayments();
        } catch (err) {
            alert("Failed to post payment: " + (err instanceof Error ? err.message : "Error"));
        }
    };

    const handleVoid = async (id: number) => {
        if (!confirm("Are you sure you want to void this posted payment? Reversing entries will be created and invoice balances reset.")) return;
        try {
            await fetchWithAuth(`/api/inventory/laundry/vendor-billing/payments/${id}/void`, { method: "POST" });
            fetchPayments();
        } catch (err) {
            alert("Failed to void payment: " + (err instanceof Error ? err.message : "Error"));
        }
    };

    const filteredPayments = payments.filter(p =>
        p.paymentNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/laundry/vendor-billing/portal" className="hover:text-foreground hover:underline transition-colors">
                    Billing Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Vendor Payments</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vendor Payments</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Record and track vendor disbursements and invoice allocations.</p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all shrink-0"
                    >
                        <Plus size={18} /> Record Vendor Payment
                    </button>
                )}
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Search by payment number or vendor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                {loading ? (
                    <div className="py-12 text-center text-muted-foreground animate-pulse">Loading payments...</div>
                ) : filteredPayments.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">No vendor payments recorded yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50/50 dark:bg-slate-900/50">
                                    <th className="py-3 px-4 font-semibold">Payment #</th>
                                    <th className="py-3 px-4 font-semibold">Vendor</th>
                                    <th className="py-3 px-4 font-semibold">Payment Date</th>
                                    <th className="py-3 px-4 font-semibold">Method</th>
                                    <th className="py-3 px-4 font-semibold">Reference #</th>
                                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                                    <th className="py-3 px-4 font-semibold">Status</th>
                                    <th className="py-3 px-4 font-semibold text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredPayments.map((p) => (
                                    <tr key={p.id} className="hover:bg-muted/50/30 transition-colors">
                                        <td className="py-3 px-4 font-bold">{p.paymentNo}</td>
                                        <td className="py-3 px-4 font-medium">{p.vendor?.name}</td>
                                        <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString()}</td>
                                        <td className="py-3 px-4 text-xs font-medium">{p.paymentMethod}</td>
                                        <td className="py-3 px-4 text-xs text-muted-foreground">{p.referenceNo || '—'}</td>
                                        <td className="py-3 px-4 text-right font-bold text-emerald-600">${Number(p.amount).toFixed(2)}</td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
                                                p.status === 'POSTED' ? 'text-emerald-700 bg-emerald-100' :
                                                p.status === 'DRAFT' ? 'text-amber-700 bg-amber-100' : 'text-slate-700 bg-slate-100'
                                            }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {p.status === 'DRAFT' && (
                                                    <button
                                                        onClick={() => handlePost(p.id)}
                                                        className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all"
                                                    >
                                                        Post
                                                    </button>
                                                )}
                                                {p.status === 'POSTED' && (
                                                    <button
                                                        onClick={() => handleVoid(p.id)}
                                                        className="px-2 py-1 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-all"
                                                        title="Void Payment"
                                                    >
                                                        Void
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <CreatePaymentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={fetchPayments}
            />
        </div>
    );
}
