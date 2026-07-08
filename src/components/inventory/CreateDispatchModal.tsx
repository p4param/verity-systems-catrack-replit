"use client";

import { useState, useEffect } from "react";
import { Modal } from "./InventoryUI";
import { useAuth } from "@/lib/auth/auth-context";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { clsx } from "clsx";

export default function CreateDispatchModal({ isOpen, onClose, onSuccess }: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { fetchWithAuth } = useAuth();
    const [vendors, setVendors] = useState([]);
    const [dirtyApparels, setDirtyApparels] = useState([]);   // pre-populated dirty items
    const [allApparels, setAllApparels] = useState([]);        // full inventory – for Add Item picker
    const [submitting, setSubmitting] = useState(false);

    const [vendorId, setVendorId] = useState("");
    const [expectedReturnDate, setExpectedReturnDate] = useState("");
    // source: 'dirty' = auto-populated from dirty stock, 'manual' = added via Add Item button
    const [items, setItems] = useState([{ apparelId: "", quantity: 1, selected: true, source: "dirty" as "dirty" | "manual" }]);

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    const [vData, aData] = await Promise.all([
                        fetchWithAuth("/api/inventory/vendors"),
                        fetchWithAuth("/api/inventory/dashboard") // use dashboard for apparel list
                    ]);
                    setVendors(vData);
                    const dirty = aData.filter((a: any) => a.dirtyStock > 0);
                    setDirtyApparels(dirty);
                    setAllApparels(aData); // keep full list for manual Add Item rows

                    // Auto-fill with all currently dirty items
                    if (dirty.length > 0) {
                        setItems(dirty.map((a: any) => ({
                            apparelId: a.id.toString(),
                            quantity: a.dirtyStock,
                            selected: true,
                            source: "dirty" as const
                        })));
                    } else {
                        setItems([{ apparelId: "", quantity: 1, selected: true, source: "manual" as const }]);
                    }
                } catch (err) {
                    toast.error("Failed to load dispatch data");
                }
            };
            fetchData();
        }
    }, [isOpen, fetchWithAuth]);

    const addItem = () => setItems([...items, { apparelId: "", quantity: 1, selected: true, source: "manual" as const }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const selectedItems = items.filter(i => i.selected && i.apparelId);
        if (selectedItems.length === 0) {
            toast.error("Please select at least one item to dispatch");
            return;
        }

        setSubmitting(true);
        try {
            await fetchWithAuth("/api/inventory/laundry/dispatch", {
                method: "POST",
                body: JSON.stringify({
                    vendorId: parseInt(vendorId),
                    expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : undefined,
                    items: selectedItems.map(i => ({
                        apparelId: parseInt(i.apparelId),
                        quantity: parseInt(i.quantity.toString())
                    }))
                })
            });
            toast.success("Logistics dispatch initiated successfully");
            onSuccess();
            onClose();
            // Reset
            setVendorId("");
            setExpectedReturnDate("");
            setItems([{ apparelId: "", quantity: 1, selected: true, source: "manual" as const }]);
        } catch (err: any) {
            toast.error(err.message || "Failed to initiate dispatch. Check stock levels.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Initiate Laundry Dispatch" maxWidth="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logistics Provider</label>
                        <select
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                            value={vendorId}
                            onChange={e => setVendorId(e.target.value)}
                        >
                            <option value="">Select Vendor</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expected Return</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            value={expectedReturnDate}
                            onChange={e => setExpectedReturnDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Items for Transfer</label>
                        <button
                            type="button"
                            onClick={addItem}
                            className="text-primary text-xs font-bold flex items-center gap-1 hover:underline"
                        >
                            <Plus size={14} /> Add Item
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                        {items.map((item, index) => (
                            <div key={index} className={clsx("flex gap-3 items-center transition-opacity", !item.selected && "opacity-50")}>
                                <div className="pt-1">
                                    <input
                                        type="checkbox"
                                        checked={item.selected}
                                        onChange={e => updateItem(index, "selected", e.target.checked)}
                                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                </div>
                                <div className="flex-1">
                                    <select
                                        required={item.selected}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                                        value={item.apparelId}
                                        onChange={e => updateItem(index, "apparelId", e.target.value)}
                                    >
                                        {item.source === "dirty" ? (
                                            // Pre-populated dirty rows: show only dirty apparel choices
                                            <>
                                                <option value="">Select Apparel Item</option>
                                                {dirtyApparels.map((a: any) => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.name} ({a.dirtyStock} dirty)
                                                    </option>
                                                ))}
                                            </>
                                        ) : (
                                            // Manually added rows: show full inventory
                                            <>
                                                <option value="">Select Any Inventory Item</option>
                                                {allApparels.map((a: any) => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.name} — {a.cleanStock ?? 0} clean, {a.dirtyStock ?? 0} dirty
                                                    </option>
                                                ))}
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div className="w-24">
                                    <input
                                        type="number"
                                        required={item.selected}
                                        min="1"
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                                        placeholder="Qty"
                                        value={item.quantity}
                                        onChange={e => updateItem(index, "quantity", e.target.value)}
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
                        Back
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : "Confirm Dispatch"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
