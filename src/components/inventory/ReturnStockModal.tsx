import { useState } from "react";
import { X, Loader2, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

interface ReturnStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    onSuccess: () => void;
}

export default function ReturnStockModal({ isOpen, onClose, order, onSuccess }: ReturnStockModalProps) {
    const { fetchWithAuth } = useAuth();

    const [items, setItems] = useState(
        order.items.map((item: any) => ({
            purchaseOrderItemId: item.id,
            apparelId: item.apparel.id,
            name: item.apparel.name,
            previouslyReceived: item.receivedQty,
            returnQty: 0,
        }))
    );

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const updateItem = (index: number, field: string, value: number) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payloadItems = items
            .filter((i: any) => i.returnQty > 0)
            .map((i: any) => ({
                purchaseOrderItemId: i.purchaseOrderItemId,
                apparelId: i.apparelId,
                returnQty: i.returnQty
            }));

        if (payloadItems.length === 0) {
            setError("Please specify quantities to return.");
            return;
        }

        for (const i of payloadItems) {
            const original = items.find((o: any) => o.purchaseOrderItemId === i.purchaseOrderItemId);
            if (original && (i.returnQty > original.previouslyReceived)) {
                setError(`Cannot return more than what was received for ${original.name}. Max is ${original.previouslyReceived}.`);
                return;
            }
        }

        setLoading(true);
        setError("");

        try {
            await fetchWithAuth(`/api/inventory/purchases/${order.id}/return`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: payloadItems })
            });
            onSuccess();
        } catch (err: any) {
            setError(err.message || "Failed to return stock.");
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
                        <h2 className="text-xl font-bold flex items-center gap-2 text-rose-700">
                            <ArrowRightLeft size={24} />
                            Return Goods
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">Return previously received stock to the supplier.</p>
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

                    <form id="return-stock-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="overflow-x-auto border border-border rounded-xl">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-muted/50 border-b border-border">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-slate-600">Apparel</th>
                                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">Available to Return</th>
                                        <th className="px-4 py-3 font-semibold text-rose-700 text-center w-32 border-l border-border">Return Qty</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {items.map((item: any, index: number) => {
                                        return (
                                            <tr key={index} className="hover:bg-muted/50/50">
                                                <td className="px-4 py-3 font-medium">
                                                    {item.name}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-700">
                                                    {item.previouslyReceived}
                                                </td>
                                                <td className="px-4 py-2 border-l border-border bg-rose-50/30">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={item.previouslyReceived}
                                                        value={item.returnQty}
                                                        onChange={e => updateItem(index, 'returnQty', parseInt(e.target.value, 10) || 0)}
                                                        className="w-full border border-rose-200 rounded p-1 text-center font-bold text-rose-800 bg-card focus:ring-2 focus:ring-rose-500 outline-none"
                                                        disabled={item.previouslyReceived === 0}
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
                        form="return-stock-form"
                        disabled={loading}
                        className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Confirm Return
                    </button>
                </div>
            </div>
        </div>
    );
}
