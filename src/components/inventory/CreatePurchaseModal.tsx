import { useState, useEffect } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

interface CreatePurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreatePurchaseModal({ isOpen, onClose, onSuccess }: CreatePurchaseModalProps) {
    const { fetchWithAuth } = useAuth();
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [apparels, setApparels] = useState<any[]>([]);

    const [supplierId, setSupplierId] = useState("");
    const [poNumber, setPoNumber] = useState("");
    const [expectedDate, setExpectedDate] = useState("");
    const [notes, setNotes] = useState("");

    const [items, setItems] = useState<{ apparelId: number; orderedQty: number; unitCost: number }[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            loadFormOptions();
        }
    }, [isOpen]);

    const loadFormOptions = async () => {
        try {
            const [supps, apps] = await Promise.all([
                fetchWithAuth("/api/inventory/suppliers?isActive=true"),
                fetchWithAuth("/api/inventory/apparels?isActive=true")
            ]);
            setSuppliers(supps);
            setApparels(apps);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddItem = () => {
        if (apparels.length > 0) {
            setItems([...items, { apparelId: apparels[0].id, orderedQty: 1, unitCost: 0 }]);
        }
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: number) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId || !poNumber || items.length === 0) {
            setError("Supplier, PO Number, and at least one item are required.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await fetchWithAuth("/api/inventory/purchases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    supplierId: parseInt(supplierId, 10),
                    poNumber,
                    expectedDate: expectedDate || undefined,
                    notes,
                    items
                })
            });
            onSuccess();
        } catch (err: any) {
            setError(err.message || "Failed to create purchase order.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">New Purchase Order</h2>
                        <p className="text-sm text-muted-foreground mt-1">Create a DRAFT purchase order for inbound stock.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="p-3 mb-6 border border-rose-200 bg-rose-50 text-rose-600 rounded-lg text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form id="create-po-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1 cursor-pointer">Supplier</label>
                                <select
                                    required
                                    value={supplierId}
                                    onChange={e => setSupplierId(e.target.value)}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                >
                                    <option value="">Select Supplier...</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 cursor-pointer">PO Number</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. PO-2026-001"
                                    value={poNumber}
                                    onChange={e => setPoNumber(e.target.value)}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1 cursor-pointer">Expected Delivery Date (Optional)</label>
                                <input
                                    type="date"
                                    value={expectedDate}
                                    onChange={e => setExpectedDate(e.target.value)}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1 cursor-pointer">Notes (Optional)</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Any additional notes..."
                                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px]"
                            />
                        </div>

                        <div className="border-t border-border pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">Order Items</h3>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                                >
                                    <Plus size={14} /> Add Item
                                </button>
                            </div>

                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="flex gap-3 items-end bg-muted/50 p-3 rounded-lg border border-border/50">
                                        <div className="flex-1">
                                            <label className="block text-xs font-semibold mb-1 text-slate-500">Apparel</label>
                                            <select
                                                required
                                                value={item.apparelId}
                                                onChange={e => updateItem(index, 'apparelId', parseInt(e.target.value, 10))}
                                                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                            >
                                                {apparels.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-xs font-semibold mb-1 text-slate-500">Qty</label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                value={item.orderedQty}
                                                onChange={e => updateItem(index, 'orderedQty', parseInt(e.target.value, 10) || 0)}
                                                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-right"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-xs font-semibold mb-1 text-slate-500">Unit Cost est.</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unitCost}
                                                onChange={e => updateItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                                                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-right"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(index)}
                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 h-[38px]"
                                            title="Remove Item"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                {items.length === 0 && (
                                    <div className="text-sm text-center py-6 text-slate-500 border border-dashed rounded-lg">
                                        No items added. Click "Add Item" to start.
                                    </div>
                                )}
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-border bg-muted/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="create-po-form"
                        disabled={loading || items.length === 0}
                        className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Create Purchase Order
                    </button>
                </div>
            </div>
        </div>
    );
}
