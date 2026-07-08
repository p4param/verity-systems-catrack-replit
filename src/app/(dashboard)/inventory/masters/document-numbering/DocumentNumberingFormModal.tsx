"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { X } from "lucide-react";

export default function DocumentNumberingFormModal({ isOpen, onClose, initialData, onSaved }) {
    const { fetchWithAuth, user } = useAuth();
    const canUpdate = user?.permissions?.includes("INVENTORY_MASTER_UPDATE");

    const [formData, setFormData] = useState({
        prefix: initialData?.prefix || "",
        currentSequence: initialData?.currentSequence || 1,
        resetYearly: initialData?.resetYearly ?? true
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const isReadOnly = !canUpdate;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (isReadOnly) {
            onClose();
            return;
        }

        setSubmitting(true);
        try {
            await fetchWithAuth(`/api/masters/document-numbering/${initialData.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    prefix: formData.prefix.toUpperCase(),
                    currentSequence: parseInt(formData.currentSequence, 10),
                    resetYearly: formData.resetYearly
                })
            });
            onSaved();
            onClose();
        } catch (err) {
            setError(err.message || "Failed to save configuration");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-card rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">
                        Configure {initialData?.entityType} Numbering
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
                            <label className="block text-sm font-medium text-foreground mb-1">Prefix</label>
                            <input
                                type="text"
                                value={formData.prefix}
                                onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                                className="w-full px-3 py-2 border border-border rounded-md shadow-sm xl:text-sm font-mono uppercase"
                                placeholder="e.g. PO"
                                disabled={isReadOnly}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Next Sequence Number</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.currentSequence}
                                onChange={(e) => setFormData({ ...formData, currentSequence: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md shadow-sm xl:text-sm"
                                disabled={isReadOnly}
                                required
                            />
                            <p className="mt-1 text-xs text-amber-600">
                                Warning: Changing this may cause numbering gaps or collisions if set too low.
                            </p>
                        </div>

                        <label className="flex items-center gap-2 mt-4 pt-2">
                            <input
                                type="checkbox"
                                checked={formData.resetYearly}
                                onChange={(e) => setFormData({ ...formData, resetYearly: e.target.checked })}
                                className="rounded border-border text-primary"
                                disabled={isReadOnly}
                            />
                            <span className="text-sm text-foreground">Append Year Suffix (e.g. PO-0001-24)</span>
                        </label>

                        <div className="p-3 bg-muted/50 border border-border rounded-md mt-4">
                            <span className="text-sm text-muted-foreground block mb-1">Preview Format:</span>
                            <span className="font-mono font-medium text-foreground">
                                {formData.prefix.toUpperCase()}-{String(formData.currentSequence).padStart(5, '0')}
                                {formData.resetYearly ? `-${new Date().getFullYear().toString().slice(-2)}` : ''}
                            </span>
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
                                {submitting ? "Saving..." : "Save Configuration"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
