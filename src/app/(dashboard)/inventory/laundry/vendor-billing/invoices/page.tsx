"use client";

import { useState, useEffect } from "react";
import { Receipt, Plus, Search, CheckCircle, Clock, XCircle, Ban } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import Link from "next/link";
import GenerateInvoiceModal from "./GenerateInvoiceModal";

export default function VendorInvoicesPage() {
    const { fetchWithAuth, user } = useAuth();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

    const canCreate = user?.permissions?.includes("LAUNDRY_VENDOR_BILLING_CREATE");

    const fetchInvoices = async () => {
        try {
            const data = await fetchWithAuth("/api/inventory/laundry/vendor-billing/invoices");
            setInvoices(data || []);
        } catch (err) {
            console.error("Failed to load vendor invoices:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [fetchWithAuth]);

    const handlePost = async (id: number) => {
        if (!confirm("Are you sure you want to post this invoice? Once posted, line items become immutable and debit balance will be logged.")) return;
        try {
            await fetchWithAuth(`/api/inventory/laundry/vendor-billing/invoices/${id}/post`, { method: "POST" });
            fetchInvoices();
        } catch (err) {
            alert("Failed to post invoice: " + (err instanceof Error ? err.message : "Error"));
        }
    };

    const handleCancel = async (id: number) => {
        if (!confirm("Are you sure you want to cancel this invoice? Unbilled items will be released.")) return;
        try {
            await fetchWithAuth(`/api/inventory/laundry/vendor-billing/invoices/${id}/cancel`, { method: "POST" });
            fetchInvoices();
        } catch (err) {
            alert("Failed to cancel invoice: " + (err instanceof Error ? err.message : "Error"));
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/laundry/vendor-billing/portal" className="hover:text-foreground hover:underline transition-colors">
                    Billing Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Vendor Invoices</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vendor Invoices</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Review, post, and manage laundry vendor billing statements.</p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all shrink-0"
                    >
                        <Plus size={18} /> Generate Vendor Invoice
                    </button>
                )}
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Search by invoice number or vendor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                {loading ? (
                    <div className="py-12 text-center text-muted-foreground animate-pulse">Loading invoices...</div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">No vendor invoices found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50/50 dark:bg-slate-900/50">
                                    <th className="py-3 px-4 font-semibold">Invoice #</th>
                                    <th className="py-3 px-4 font-semibold">Vendor</th>
                                    <th className="py-3 px-4 font-semibold">Invoice Date</th>
                                    <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                                    <th className="py-3 px-4 font-semibold text-right">Tax</th>
                                    <th className="py-3 px-4 font-semibold text-right">Total Amount</th>
                                    <th className="py-3 px-4 font-semibold text-right">Paid Amount</th>
                                    <th className="py-3 px-4 font-semibold">Status</th>
                                    <th className="py-3 px-4 font-semibold text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-muted/50/30 transition-colors">
                                        <td className="py-3 px-4 font-bold">{inv.invoiceNo}</td>
                                        <td className="py-3 px-4 font-medium">{inv.vendor?.name}</td>
                                        <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                                        <td className="py-3 px-4 text-right">${Number(inv.subtotal).toFixed(2)}</td>
                                        <td className="py-3 px-4 text-right text-muted-foreground">${Number(inv.taxAmount).toFixed(2)}</td>
                                        <td className="py-3 px-4 text-right font-bold">${Number(inv.totalAmount).toFixed(2)}</td>
                                        <td className="py-3 px-4 text-right text-emerald-600 font-semibold">${Number(inv.paidAmount).toFixed(2)}</td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
                                                inv.status === 'PAID' ? 'text-emerald-700 bg-emerald-100' :
                                                inv.status === 'POSTED' ? 'text-blue-700 bg-blue-100' :
                                                inv.status === 'DRAFT' ? 'text-amber-700 bg-amber-100' : 'text-rose-700 bg-rose-100'
                                            }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {inv.status === 'DRAFT' && (
                                                    <>
                                                        <button
                                                            onClick={() => handlePost(inv.id)}
                                                            className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all"
                                                        >
                                                            Post
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancel(inv.id)}
                                                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-all"
                                                            title="Cancel Invoice"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
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

            <GenerateInvoiceModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                onGenerated={fetchInvoices}
            />
        </div>
    );
}
