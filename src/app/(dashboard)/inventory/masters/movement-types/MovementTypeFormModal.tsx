"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { X } from "lucide-react";

export default function MovementTypeFormModal({ isOpen, onClose, initialData, onSaved }) {
    const { fetchWithAuth, user } = useAuth();
    const isEdit = !!initialData;
    const isSystem = initialData?.isSystemControlled;
    const canUpdate = user?.permissions?.includes("INVENTORY_MASTER_UPDATE");

    const [formData, setFormData] = useState({
        code: initialData?.code || "",
        direction: initialData?.direction || "IN",
        affectsClean: initialData?.affectsClean || false,
        affectsDirty: initialData?.affectsDirty || false,
        isRecoveryType: initialData?.isRecoveryType || false,
        isActive: initialData?.isActive ?? true
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const isReadOnly = isSystem || (isEdit && !canUpdate);

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
                await fetchWithAuth(`/api/masters/movement-types/${initialData.id}`, {
                    method: "PUT",
                    body: JSON.stringify(formData)
                });
            } else {
                await fetchWithAuth("/api/masters/movement-types", {
                    method: "POST",
                    body: JSON.stringify(formData)
                });
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(err.message || "Failed to save movement type");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-card rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">
                        {isReadOnly ? "Movement Type Details" : isEdit ? "Edit Movement Type" : "New Movement Type"}
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

                    {isSystem && (
                        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded text-sm shrink-0">
                            This is a system-controlled movement type. Its properties cannot be altered to maintain ledger integrity.
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
                                placeholder="e.g. RETURN_TO_VENDOR"
                                disabled={isEdit || isReadOnly}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Direction</label>
                            <select
                                value={formData.direction}
                                onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md shadow-sm xl:text-sm"
                                disabled={isReadOnly}
                                required
                            >
                                <option value="IN">Inbound (Additive)</option>
                                <option value="OUT">Outbound (Deductive)</option>
                                <option value="TRANSFER">Transfer (Neutral)</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.affectsClean}
                                    onChange={(e) => setFormData({ ...formData, affectsClean: e.target.checked })}
                                    className="rounded border-border text-primary"
                                    disabled={isReadOnly}
                                />
                                <span className="text-sm text-foreground">Affects Clean Stock Inventory</span>
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.affectsDirty}
                                    onChange={(e) => setFormData({ ...formData, affectsDirty: e.target.checked })}
                                    className="rounded border-border text-primary"
                                    disabled={isReadOnly}
                                />
                                <span className="text-sm text-foreground">Affects Dirty Stock Inventory</span>
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isRecoveryType}
                                    onChange={(e) => setFormData({ ...formData, isRecoveryType: e.target.checked })}
                                    className="rounded border-border text-primary"
                                    disabled={isReadOnly}
                                />
                                <span className="text-sm text-foreground">Is a Stock Recovery Operation</span>
                            </label>
                        </div>
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
                                {submitting ? "Saving..." : "Save Movement Type"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
