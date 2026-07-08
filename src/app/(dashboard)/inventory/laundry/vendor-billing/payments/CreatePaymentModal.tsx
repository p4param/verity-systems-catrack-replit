"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export default function CreatePaymentModal({
    isOpen,
    onClose,
    onCreated
}: {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}) {
    const { fetchWithAuth } = useAuth();
    const [vendors, setVendors] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const today = new Date().toISOString().split("T")[0];

    const [formData, setFormData] = useState({
        vendorId: "",
        paymentDate: today,
        amount: "",
        paymentMethod: "BANK_TRANSFER",
        referenceNo: "",
        remarks: "",
    });

    const [allocations, setAllocations] = useState<Record<number, number>>({});

    useEffect(() => {
        if (!isOpen) return;
        const loadVendors = async () => {
            try {
                const data = await fetchWithAuth("/api/inventory/vendors");
                setVendors(data || []);
                if (data && data.length > 0) {
                    setFormData(prev => ({ ...prev, vendorId: data[0].id.toString() }));
                }
            } catch (err) {
                console.error("Failed to load vendors:", err);
            }
        };
        loadVendors();
    }, [isOpen, fetchWithAuth]);

    useEffect(() => {
        if (!formData.vendorId || !isOpen) return;
        const fetchVendorInvoices = async () => {
            try {
                const data = await fetchWithAuth(`/api/inventory/laundry/vendor-billing/invoices?vendorId=${formData.vendorId}`);
                // Filter to invoices with outstanding balance
                const unpaid = (data || []).filter((inv: any) =>
                    (inv.status === "POSTED" || inv.status === "PARTIALLY_PAID") &&
                    (Number(inv.totalAmount) - Number(inv.paidAmount)) > 0
                );
                setInvoices(unpaid);
                setAllocations({});
            } catch (err) {
                console.error("Failed to load invoices for payment:", err);
            }
        };
        fetchVendorInvoices();
    }, [formData.vendorId, isOpen, fetchWithAuth]);

    if (!isOpen) return null;

    const handleAllocationChange = (invoiceId: number, val: string) => {
        const parsed = parseFloat(val);
        setAllocations(prev => ({
            ...prev,
            [invoiceId]: isNaN(parsed) ? 0 : parsed,
        }));
    };

    const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
    const paymentAmount = parseFloat(formData.amount) || 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (paymentAmount <= 0) {
            toast.error("Payment amount must be greater than 0");
            return;
        }

        const validAllocations = Object.entries(allocations)
            .filter(([_, amt]) => amt > 0)
            .map(([invId, amt]) => ({ invoiceId: parseInt(invId), amountApplied: amt }));

        if (validAllocations.length === 0) {
            toast.error("Please allocate payment to at least one invoice.");
            return;
        }

        if (totalAllocated > paymentAmount) {
            toast.error(`Total allocation ($${totalAllocated.toFixed(2)}) exceeds payment amount ($${paymentAmount.toFixed(2)})`);
            return;
        }

        setSubmitting(true);

        try {
            await fetchWithAuth("/api/inventory/laundry/vendor-billing/payments", {
                method: "POST",
                body: JSON.stringify({
                    vendorId: parseInt(formData.vendorId),
                    paymentDate: formData.paymentDate,
                    amount: paymentAmount,
                    paymentMethod: formData.paymentMethod,
                    referenceNo: formData.referenceNo || undefined,
                    remarks: formData.remarks || undefined,
                    allocations: validAllocations,
                }),
            });

            toast.success("Vendor payment recorded successfully!");
            onCreated();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to record payment");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-xl lg:max-w-2xl mx-auto flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-lg font-bold text-foreground">Record Vendor Payment</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground rounded-full p-1 hover:bg-muted">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                    <form id="createPaymentForm" onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Vendor *</label>
                                <select
                                    value={formData.vendorId}
                                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                >
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Payment Date *</label>
                                <input
                                    type="date"
                                    value={formData.paymentDate}
                                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Payment Amount ($) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md text-sm font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Payment Method *</label>
                                <select
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                    <option value="CHEQUE">Cheque</option>
                                    <option value="CASH">Cash</option>
                                    <option value="ONLINE">Online Payment</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Reference / Cheque #</label>
                                <input
                                    type="text"
                                    value={formData.referenceNo}
                                    onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="e.g. TXN-99182"
                                />
                            </div>
                        </div>

                        {/* Invoice Allocation Table */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-bold text-gray-800">Invoice Payment Allocation</label>
                                <span className={`text-xs font-bold ${totalAllocated > paymentAmount ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    Allocated: ${totalAllocated.toFixed(2)} / ${paymentAmount.toFixed(2)}
                                </span>
                            </div>

                            {invoices.length === 0 ? (
                                <div className="p-4 text-center text-xs text-muted-foreground bg-muted/50 rounded-lg border border-dashed border-border">
                                    No posted or partially paid invoices with open balance found for this vendor.
                                </div>
                            ) : (
                                <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-muted/50 sticky top-0 border-b border-border">
                                            <tr>
                                                <th className="py-2 px-3 font-semibold">Invoice #</th>
                                                <th className="py-2 px-3 font-semibold text-right">Total</th>
                                                <th className="py-2 px-3 font-semibold text-right">Outstanding</th>
                                                <th className="py-2 px-3 font-semibold text-right w-32">Amount to Apply ($)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {invoices.map(inv => {
                                                const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount);
                                                return (
                                                    <tr key={inv.id} className="hover:bg-muted/50">
                                                        <td className="py-2 px-3 font-bold">{inv.invoiceNo}</td>
                                                        <td className="py-2 px-3 text-right">${Number(inv.totalAmount).toFixed(2)}</td>
                                                        <td className="py-2 px-3 text-right font-semibold text-amber-600">${outstanding.toFixed(2)}</td>
                                                        <td className="py-1 px-2 text-right">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                max={outstanding}
                                                                min="0"
                                                                value={allocations[inv.id] !== undefined ? allocations[inv.id] : ""}
                                                                onChange={(e) => handleAllocationChange(inv.id, e.target.value)}
                                                                className="w-full px-2 py-1 border border-border rounded text-right font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                                                placeholder="0.00"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 bg-muted/50 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted/50"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="createPaymentForm"
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                        {submitting ? "Processing Payment..." : "Save & Record Payment"}
                    </button>
                </div>
            </div>
        </div>
    );
}
