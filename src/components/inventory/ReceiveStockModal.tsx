import { useState } from "react";
import { X, Loader2, Package } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

interface ReceiveStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    onSuccess: () => void;
}

export default function ReceiveStockModal({ isOpen, onClose, order, onSuccess }: ReceiveStockModalProps) {
    const { fetchWithAuth } = useAuth();

    // items: { purchaseOrderItemId: number; apparelId: number; receiveQty: number; damagedQty: number }[]
    const [items, setItems] = useState(
        order.items.map((item: any) => ({
            purchaseOrderItemId: item.id,
            apparelId: item.apparel.id,
            name: item.apparel.name,
            orderedQty: item.orderedQty,
            previouslyReceived: item.receivedQty,
            receiveQty: 0,
            damagedQty: 0,
        }))
    );

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const updateItem = (index: number, field: string, value: number) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    const handleReceiveAll = () => {
        setItems(items.map((item: any) => ({
            ...item,
            receiveQty: Math.max(0, item.orderedQty - item.previouslyReceived),
            damagedQty: 0
        })));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payloadItems = items
            .filter((i: any) => i.receiveQty > 0 || i.damagedQty > 0)
            .map((i: any) => ({
                purchaseOrderItemId: i.purchaseOrderItemId,
                apparelId: i.apparelId,
                receiveQty: i.receiveQty,
                damagedQty: i.damagedQty
            }));

        if (payloadItems.length === 0) {
            setError("Please specify quantities to receive or mark as damaged.");
            return;
        }

        // Validate quantities client-side
        for (const i of payloadItems) {
            const original = items.find((o: any) => o.purchaseOrderItemId === i.purchaseOrderItemId);
            if (original && (i.receiveQty + i.damagedQty + original.previouslyReceived > original.orderedQty)) {
                setError(`Cannot receive more than ordered for ${original.name}. Attempted to over-receive by ${(i.receiveQty + i.damagedQty + original.previouslyReceived) - original.orderedQty}.`);
                return;
            }
        }

        setLoading(true);
        setError("");

        try {
            await fetchWithAuth(`/api/inventory/purchases/${order.id}/receive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: payloadItems })
            });
            onSuccess();
        } catch (err: any) {
            setError(err.message || "Failed to receive stock.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Package className="text-emerald-600" size={24} />
                            Receive Goods
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">Receive stock against PO {order.poNumber}</p>
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

                    <form id="receive-stock-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleReceiveAll}
                                className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded font-semibold transition-colors"
                            >
                                Mark All Pending as Received
                            </button>
                        </div>

                        <div className="overflow-x-auto border border-border rounded-xl">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-muted/50 border-b border-border">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-slate-600">Apparel</th>
                                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">Pending</th>
                                        <th className="px-4 py-3 font-semibold text-emerald-700 text-center w-32 border-l border-border">Receive Clean</th>
                                        <th className="px-4 py-3 font-semibold text-rose-700 text-center w-32">Arrived Damaged</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {items.map((item: any, index: number) => {
                                        const pending = Math.max(0, item.orderedQty - item.previouslyReceived);
                                        return (
                                            <tr key={index} className="hover:bg-muted/50/50">
                                                <td className="px-4 py-3 font-medium">
                                                    {item.name}
                                                    <div className="text-[10px] text-muted-foreground font-normal">
                                                        Ordered: {item.orderedQty} • Prev. Rcvd: {item.previouslyReceived}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-700">
                                                    {pending}
                                                </td>
                                                <td className="px-4 py-2 border-l border-border bg-emerald-50/30">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={pending}
                                                        value={item.receiveQty}
                                                        onChange={e => updateItem(index, 'receiveQty', parseInt(e.target.value, 10) || 0)}
                                                        className="w-full border border-emerald-200 rounded p-1 text-center font-bold text-emerald-800 bg-card focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 bg-rose-50/30">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.damagedQty}
                                                        onChange={e => updateItem(index, 'damagedQty', parseInt(e.target.value, 10) || 0)}
                                                        className="w-full border border-rose-200 rounded p-1 text-center font-bold text-rose-800 bg-card focus:ring-2 focus:ring-rose-500 outline-none"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
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
                        form="receive-stock-form"
                        disabled={loading}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Receive Goods
                    </button>
                </div>
            </div>
        </div>
    );
}
