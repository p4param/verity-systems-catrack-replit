"use client";

import { useState, useEffect } from "react";
import { Modal } from "./InventoryUI";
import { useAuth } from "@/lib/auth/auth-context";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CreateApparelModal({ isOpen, onClose, onSuccess }: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { fetchWithAuth } = useAuth();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        categoryId: "",
        unit: "PCS",
        minStockLevel: 0,
        unitValue: 0
    });

    useEffect(() => {
        if (isOpen) {
            const fetchCategories = async () => {
                setLoading(true);
                try {
                    const data = await fetchWithAuth("/api/inventory/categories");
                    setCategories(data);
                } catch (err) {
                    toast.error("Failed to load categories");
                } finally {
                    setLoading(false);
                }
            };
            fetchCategories();
        }
    }, [isOpen, fetchWithAuth]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await fetchWithAuth("/api/inventory/apparels", {
                method: "POST",
                body: JSON.stringify({
                    ...formData,
                    categoryId: parseInt(formData.categoryId),
                    minStockLevel: parseInt(formData.minStockLevel.toString()),
                    unitValue: parseFloat(formData.unitValue.toString())
                })
            });
            toast.success("Apparel asset registered successfully");
            onSuccess();
            onClose();
            setFormData({ name: "", categoryId: "", unit: "PCS", minStockLevel: 0, unitValue: 0 });
        } catch (err: any) {
            toast.error(err.message || "Failed to create apparel item");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Apparel Asset">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Apparel Name</label>
                    <input
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        placeholder="e.g. Tactical Vest XL"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                        <select
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                            value={formData.categoryId}
                            onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                        >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unit</label>
                        <input
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="PCS, SET"
                            value={formData.unit}
                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Min Stock Level</label>
                        <input
                            type="number"
                            required
                            min="0"
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            value={formData.minStockLevel}
                            onChange={e => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unit Value ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            value={formData.unitValue}
                            onChange={e => setFormData({ ...formData, unitValue: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : "Registry Asset"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
