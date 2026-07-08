"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export default function VendorFormModal({ isOpen, onClose, initialData, onSaved }: any) {
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        contactInfo: initialData?.contactInfo || "",
        taxId: initialData?.taxId || "",
        paymentTerms: initialData?.paymentTerms || "NET30",
        creditLimit: initialData?.creditLimit ? initialData.creditLimit.toString() : "",
        isActive: initialData?.isActive ?? true
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const { fetchWithAuth } = useAuth();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const url = initialData?.id
                ? `/api/masters/vendors/${initialData.id}`
                : "/api/masters/vendors";
            const method = initialData?.id ? "PUT" : "POST";

            await fetchWithAuth(url, {
                method,
                body: JSON.stringify({
                    ...formData,
                    creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : null,
                }),
            });

            toast.success(initialData?.id ? "Vendor updated successfully" : "Vendor created successfully");
            onSaved();
            onClose();
        } catch (err: any) {
            const msg = err.message || "Failed to save vendor";
            setError(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg lg:max-w-xl mx-auto flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-lg font-bold text-foreground">
                        {initialData ? "Edit Laundry Vendor" : "New Laundry Vendor"}
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground rounded-full p-1 hover:bg-muted">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1">
                    {error && (
                        <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form id="vendorForm" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Vendor Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Tax ID / GSTIN</label>
                                <input
                                    type="text"
                                    value={formData.taxId}
                                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="e.g. TAX-994812"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Payment Terms</label>
                                <select
                                    value={formData.paymentTerms}
                                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                                    <option value="NET15">NET 15</option>
                                    <option value="NET30">NET 30</option>
                                    <option value="NET60">NET 60</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Credit Limit ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.creditLimit}
                                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="e.g. 5000.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Contact Information</label>
                            <textarea
                                value={formData.contactInfo}
                                onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md shadow-sm text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Email, Phone, Address..."
                            />
                        </div>

                        <div className="flex items-center gap-4 mt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-foreground">Active Vendor</span>
                            </label>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 bg-muted/50 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted/50 focus:outline-none"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="vendorForm"
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 focus:outline-none disabled:opacity-50"
                    >
                        {submitting ? "Saving..." : "Save Vendor"}
                    </button>
                </div>
            </div>
        </div>
    );
}
