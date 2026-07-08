"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export default function GenerateInvoiceModal({
    isOpen,
    onClose,
    onGenerated
}: {
    isOpen: boolean;
    onClose: () => void;
    onGenerated: () => void;
}) {
    const { fetchWithAuth } = useAuth();
    const [vendors, setVendors] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const today = now.toISOString().split("T")[0];

    const [formData, setFormData] = useState({
        vendorId: "",
        fromDate: firstDay,
        toDate: today,
        remarks: "",
    });

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

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await fetchWithAuth("/api/inventory/laundry/vendor-billing/invoices/generate", {
                method: "POST",
                body: JSON.stringify({
                    vendorId: parseInt(formData.vendorId),
                    fromDate: formData.fromDate,
                    toDate: formData.toDate,
                    remarks: formData.remarks || undefined,
                }),
            });

            toast.success("Vendor invoice generated successfully!");
            onGenerated();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to generate invoice");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg mx-auto flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-lg font-bold text-foreground">Generate Vendor Invoice</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground rounded-full p-1 hover:bg-muted">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1">
                    <form id="generateInvoiceForm" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Target Vendor *</label>
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
                            <p className="text-xs text-muted-foreground mt-1">Select the vendor to aggregate unbilled laundry return movements.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Billing Period From *</label>
                                <input
                                    type="date"
                                    value={formData.fromDate}
                                    onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Billing Period To *</label>
                                <input
                                    type="date"
                                    value={formData.toDate}
                                    onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Remarks / Internal Notes</label>
                            <textarea
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Optional notes regarding this invoice run..."
                            />
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
                        form="generateInvoiceForm"
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                        {submitting ? "Calculating & Generating..." : "Generate Invoice"}
                    </button>
                </div>
            </div>
        </div>
    );
}
