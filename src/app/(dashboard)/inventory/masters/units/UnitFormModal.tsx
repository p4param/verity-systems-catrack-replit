"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { X } from "lucide-react";

export default function UnitFormModal({ isOpen, onClose, initialData, onSaved }) {
    const { fetchWithAuth, user } = useAuth();
    const isEdit = !!initialData;
    const canUpdate = user?.permissions?.includes("INVENTORY_MASTER_UPDATE");

    const [formData, setFormData] = useState({
        code: initialData?.code || "",
        description: initialData?.description || "",
        conversionFactor: initialData?.conversionFactor || 1.0,
        isActive: initialData?.isActive ?? true
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const isReadOnly = isEdit && !canUpdate;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (isReadOnly) {
            onClose();
            return;
        }

        setSubmitting(true);
        try {
            if (isEdit) {
                await fetchWithAuth(`/api/masters/units/${initialData.id}`, {
                    method: "PUT",
                    body: JSON.stringify({
                        ...formData,
                        conversionFactor: parseFloat(formData.conversionFactor)
                    })
                });
            } else {
                await fetchWithAuth("/api/masters/units", {
                    method: "POST",
                    body: JSON.stringify({
                        ...formData,
                        conversionFactor: parseFloat(formData.conversionFactor)
                    })
                });
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(err.message || "Failed to save unit");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-card rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">
                        {isReadOnly ? "Unit Details" : isEdit ? "Edit Unit" : "New Unit of Measure"}
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm shrink-0">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Code</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                className="w-full px-3 py-2 border border-border rounded-md shadow-sm xl:text-sm uppercase"
                                placeholder="e.g. SET"
                                disabled={isEdit || isReadOnly}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md shadow-sm xl:text-sm"
                                placeholder="e.g. Full Bed Set"
                                disabled={isReadOnly}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Base Conversion Factor</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={formData.conversionFactor}
                                onChange={(e) => setFormData({ ...formData, conversionFactor: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md shadow-sm xl:text-sm"
                                disabled={isReadOnly}
                                required
                            />
                            <p className="mt-1 text-xs text-muted-foreground">Multiplier to convert to baseline equivalent unit.</p>
                        </div>

                        {isEdit && (
                            <label className="flex items-center gap-2 mt-4 pt-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="rounded border-border text-primary"
                                    disabled={isReadOnly}
                                />
                                <span className="text-sm text-foreground">Active (Visible in dropdowns)</span>
                            </label>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted/50 text-sm font-medium"
                        >
                            {isReadOnly ? "Close" : "Cancel"}
                        </button>
                        {!isReadOnly && (
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium disabled:opacity-50"
                            >
                                {submitting ? "Saving..." : "Save Unit"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
