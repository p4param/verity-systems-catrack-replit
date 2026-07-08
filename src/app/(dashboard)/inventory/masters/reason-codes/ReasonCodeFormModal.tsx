"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { X } from "lucide-react";

export default function ReasonCodeFormModal({ isOpen, onClose, initialData, onSaved }) {
    const { fetchWithAuth, user } = useAuth();
    const isEdit = !!initialData;
    const canUpdate = user?.permissions?.includes("INVENTORY_MASTER_UPDATE");

    const [formData, setFormData] = useState({
        code: initialData?.code || "",
        description: initialData?.description || "",
        appliesTo: initialData?.appliesTo || "ADJUSTMENT",
        requiresApproval: initialData?.requiresApproval || false,
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
                await fetchWithAuth(`/api/masters/reason-codes/${initialData.id}`, {
                    method: "PUT",
                    body: JSON.stringify(formData)
                });
            } else {
                await fetchWithAuth("/api/masters/reason-codes", {
                    method: "POST",
                    body: JSON.stringify(formData)
                });
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(err.message || "Failed to save reason code");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-card rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">
                        {isReadOnly ? "Reason Code Details" : isEdit ? "Edit Reason Code" : "New Reason Code"}
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
                                placeholder="e.g. AUDIT_FOUND"
                                disabled={isEdit || isReadOnly}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md shadow-sm xl:text-sm"
                                rows={2}
                                disabled={isReadOnly}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Applies To Module</label>
                            <select
                                value={formData.appliesTo}
                                onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md shadow-sm xl:text-sm"
                                disabled={isReadOnly}
                                required
                            >
                                <option value="ADJUSTMENT">Manual Stock Adjustments</option>
                                <option value="EVENT">Event Allocations</option>
                                <option value="LAUNDRY">Laundry Operations</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.requiresApproval}
                                    onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                                    className="rounded border-border text-primary"
                                    disabled={isReadOnly}
                                />
                                <span className="text-sm text-foreground">Requires Manager Approval when used</span>
                            </label>

                            {isEdit && (
                                <label className="flex items-center gap-2 mt-2">
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
                                {submitting ? "Saving..." : "Save Reason Code"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
