"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export default function CreateRateModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
    const { fetchWithAuth } = useAuth();
    const [vendors, setVendors] = useState<any[]>([]);
    const [apparels, setApparels] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        vendorId: "",
        apparelId: "",
        washingRate: "",
        ironingRate: "",
        dryCleaningRate: "",
        effectiveFrom: new Date().toISOString().split("T")[0],
        effectiveTo: "",
    });

    useEffect(() => {
        if (!isOpen) return;
        const loadOptions = async () => {
            try {
                const [vData, aData] = await Promise.all([
                    fetchWithAuth("/api/inventory/vendors"),
                    fetchWithAuth("/api/inventory/apparels"),
                ]);
                setVendors(vData || []);
                setApparels(aData || []);
                if (vData && vData.length > 0) setFormData(prev => ({ ...prev, vendorId: vData[0].id.toString() }));
                if (aData && aData.length > 0) setFormData(prev => ({ ...prev, apparelId: aData[0].id.toString() }));
            } catch (err) {
                console.error("Failed to load select options:", err);
            }
        };
        loadOptions();
    }, [isOpen, fetchWithAuth]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await fetchWithAuth("/api/inventory/laundry/vendor-billing/rates", {
                method: "POST",
                body: JSON.stringify({
                    vendorId: parseInt(formData.vendorId),
                    apparelId: parseInt(formData.apparelId),
                    washingRate: parseFloat(formData.washingRate),
                    ironingRate: formData.ironingRate ? parseFloat(formData.ironingRate) : undefined,
                    dryCleaningRate: formData.dryCleaningRate ? parseFloat(formData.dryCleaningRate) : undefined,
                    effectiveFrom: formData.effectiveFrom,
                    effectiveTo: formData.effectiveTo ? formData.effectiveTo : undefined,
                }),
            });

            toast.success("Rate contract created successfully");
            onSaved();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to create rate contract");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg lg:max-w-xl mx-auto flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-lg font-bold text-foreground">New Vendor Rate Contract</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground rounded-full p-1 hover:bg-muted">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1">
                    <form id="rateForm" onSubmit={handleSubmit} className="space-y-4">
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
                                <label className="block text-sm font-medium text-foreground mb-1">Apparel Item *</label>
                                <select
                                    value={formData.apparelId}
                                    onChange={(e) => setFormData({ ...formData, apparelId: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                >
                                    {apparels.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Washing Rate ($) *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.washingRate}
                                onChange={(e) => setFormData({ ...formData, washingRate: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="e.g. 2.50"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Ironing Rate ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.ironingRate}
                                    onChange={(e) => setFormData({ ...formData, ironingRate: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Optional"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Dry Cleaning Rate ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.dryCleaningRate}
                                    onChange={(e) => setFormData({ ...formData, dryCleaningRate: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Effective From *</label>
                                <input
                                    type="date"
                                    value={formData.effectiveFrom}
                                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Effective To</label>
                                <input
                                    type="date"
                                    value={formData.effectiveTo}
                                    onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Leave blank for ongoing"
                                />
                            </div>
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
                        form="rateForm"
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                        {submitting ? "Saving..." : "Create Rate Contract"}
                    </button>
                </div>
            </div>
        </div>
    );
}
