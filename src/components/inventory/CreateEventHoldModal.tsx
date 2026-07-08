"use client";

import { useState, useEffect } from "react";
import { Modal } from "./InventoryUI";
import { useAuth } from "@/lib/auth/auth-context";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CreateEventHoldModal({ isOpen, onClose, onSuccess }: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { fetchWithAuth } = useAuth();
    const [apparels, setApparels] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const [name, setName] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [items, setItems] = useState([{ apparelId: "", reservedQty: 1 }]);

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    const aData = await fetchWithAuth("/api/inventory/dashboard");
                    setApparels(aData);
                } catch (err) {
                    toast.error("Failed to load inventory data");
                }
            };
            fetchData();
        }
    }, [isOpen, fetchWithAuth]);

    const addItem = () => setItems([...items, { apparelId: "", reservedQty: 1 }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await fetchWithAuth("/api/inventory/events", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    eventDate: eventDate ? new Date(eventDate).toISOString() : undefined,
                    reservations: items.map(i => ({
                        apparelId: parseInt(i.apparelId),
                        reservedQty: parseInt(i.reservedQty.toString())
                    }))
                })
            });
            toast.success("Event hold created successfully");
            onSuccess();
            onClose();
            // Reset
            setName("");
            setEventDate("");
            setItems([{ apparelId: "", reservedQty: 1 }]);
        } catch (err: any) {
            toast.error(err.message || "Failed to create event hold.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Event Logical Hold">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Name</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g. Annual Gala 2026"
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Date</label>
                        <input
                            required
                            type="date"
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            value={eventDate}
                            onChange={e => setEventDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reserved Assets</label>
                        <button
                            type="button"
                            onClick={addItem}
                            className="text-primary text-xs font-bold flex items-center gap-1 hover:underline"
                        >
                            <Plus size={14} /> Add Asset
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                        {items.map((item, index) => (
                            <div key={index} className="flex gap-3 items-end">
                                <div className="flex-1 space-y-1">
                                    <select
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                                        value={item.apparelId}
                                        onChange={e => updateItem(index, "apparelId", e.target.value)}
                                    >
                                        <option value="">Select Asset</option>
                                        {apparels.map(a => (
                                            <option key={a.id} value={a.id}>{a.name} ({a.available} avail)</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-24 space-y-1">
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                                        placeholder="Qty"
                                        value={item.reservedQty}
                                        onChange={e => updateItem(index, "reservedQty", e.target.value)}
                                    />
                                </div>
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-border">
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
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : "Confirm Hold"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
