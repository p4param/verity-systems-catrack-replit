"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export default function SupplierFormModal({ isOpen, onClose, initialData, onSaved, currencySymbol = "$" }) {
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        contactInfo: initialData?.contactInfo || "",
        taxId: initialData?.taxId || "",
        paymentTerms: initialData?.paymentTerms || "",
        creditLimit: initialData?.creditLimit || "",
        isPreferred: initialData?.isPreferred || false,
        isActive: initialData?.isActive ?? true
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const { fetchWithAuth } = useAuth();

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const url = initialData?.id
                ? `/api/masters/suppliers/${initialData.id}`
                : "/api/masters/suppliers";
            const method = initialData?.id ? "PUT" : "POST";

            await fetchWithAuth(url, {
                method,
                body: JSON.stringify(formData),
            });

            toast.success(initialData?.id ? "Supplier updated successfully" : "Supplier created successfully");
            onSaved();
            onClose();
        } catch (err) {
            const msg = err.message || "Failed to save supplier context";
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
                    <h2 className="text-lg font-bold">
                        {initialData ? "Edit Purchase Supplier" : "New Purchase Supplier"}
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground rounded-full p-1 hover:bg-muted">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {error && (
                        <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form id="supplierForm" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Supplier Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md shadow-sm text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Contact Information</label>
                            <textarea
                                value={formData.contactInfo}
                                onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md shadow-sm text-sm h-20 resize-none"
                                placeholder="Email, Phone, Address..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Tax ID / Registration</label>
                                <input
                                    type="text"
                                    value={formData.taxId}
                                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md shadow-sm text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Payment Terms</label>
                                <input
                                    type="text"
                                    value={formData.paymentTerms}
                                    placeholder="e.g. Net 30"
                                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md shadow-sm text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Credit Limit ({currencySymbol})</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.creditLimit}
                                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md shadow-sm text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-4 mt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isPreferred}
                                    onChange={(e) => setFormData({ ...formData, isPreferred: e.target.checked })}
                                    className="rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-foreground">Preferred Supplier</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-foreground">Active</span>
                            </label>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 bg-muted/50 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="supplierForm"
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                    >
                        {submitting ? "Saving..." : "Save Supplier"}
                    </button>
                </div>
            </div>
        </div>
    );
}
