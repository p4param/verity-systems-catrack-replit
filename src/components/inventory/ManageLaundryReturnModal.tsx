"use client";

import { useState, useEffect } from "react";
import { Modal } from "./InventoryUI";
import { useAuth } from "@/lib/auth/auth-context";
import { Loader2, CheckCircle2, AlertTriangle, Package, Minus, RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import RecordRecoveryModal from "./RecordRecoveryModal";

export default function ManageLaundryReturnModal({ isOpen, onClose, order, onSuccess }: {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    onSuccess: () => void;
}) {
    const { fetchWithAuth } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [recoveryMovement, setRecoveryMovement] = useState<any>(null);

    // items state: array of { apparelId, name, qtyDispatched, qtyReturned, qtyDamaged, qtyMissing, selected }
    const [items, setItems] = useState([]);

    const isClosed = order?.status === 'CLOSED';

    useEffect(() => {
        if (isOpen && order) {
            setItems(order.items.map(item => ({
                apparelId: item.apparelId,
                name: item.apparel.name,
                qtyDispatched: item.qtyDispatched,
                qtyAlreadyReturned: item.qtyReturned + item.qtyDamaged + item.qtyMissing,
                qtyReturned: 0,
                qtyDamaged: 0,
                qtyMissing: 0,
                selected: true
            })));
        }
    }, [isOpen, order]);

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const selectedItems = items.filter(i => i.selected);

        if (selectedItems.length === 0) {
            toast.error("Please select at least one item to return.");
            return;
        }

        // Validate quantities
        for (const item of selectedItems) {
            const totalAccounted = item.qtyReturned + item.qtyDamaged + item.qtyMissing;
            const remaining = item.qtyDispatched - item.qtyAlreadyReturned;

            if (totalAccounted > remaining) {
                toast.error(`Total returned for ${item.name} (${totalAccounted}) exceeds outstanding dispatch (${remaining}).`);
                return;
            }

            if (totalAccounted === 0) {
                toast.error(`Please enter return quantities for ${item.name}.`);
                return;
            }
        }

        setSubmitting(true);
        try {
            await fetchWithAuth("/api/inventory/laundry/returns", {
                method: "POST",
                body: JSON.stringify({
                    orderId: order.id,
                    items: selectedItems.map(i => ({
                        apparelId: i.apparelId,
                        qtyReturned: parseInt(i.qtyReturned.toString()),
                        qtyDamaged: parseInt(i.qtyDamaged.toString()),
                        qtyMissing: parseInt(i.qtyMissing.toString())
                    }))
                })
            });
            toast.success("Laundry return processed successfully");
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to process laundry return.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Reconcile Laundry Return: #${order?.id}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between bg-muted/50 p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Package size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vendor</p>
                            <p className="font-bold text-sm">{order?.vendor?.name}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sent on</p>
                        <p className="font-bold text-sm">{order ? new Date(order.createdAt).toLocaleDateString() : ""}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {order?.netLossReport && order.netLossReport.grossLoss > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-border">
                            <div className="space-y-1 text-center md:text-left">
                                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground flex items-center justify-center md:justify-start gap-1.5">
                                    <Minus size={12} className="text-rose-500" /> Gross Loss
                                </p>
                                <p className="text-xl font-black">{order.netLossReport.grossLoss}</p>
                            </div>
                            <div className="space-y-1 text-center md:text-left">
                                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground flex items-center justify-center md:justify-start gap-1.5">
                                    <RotateCcw size={12} className="text-emerald-500" /> Recovered
                                </p>
                                <p className="text-xl font-black">{order.netLossReport.totalRecovered}</p>
                            </div>
                            <div className="space-y-1 text-center md:text-left">
                                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground flex items-center justify-center md:justify-start gap-1.5">
                                    <AlertCircle size={12} className="text-amber-500" /> Net Loss
                                </p>
                                <p className="text-xl font-black">{order.netLossReport.netLoss}</p>
                            </div>
                            <div className="space-y-1 text-center md:text-left">
                                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground flex items-center justify-center md:justify-start gap-1.5">
                                    <CheckCircle2 size={12} className="text-blue-500" /> Rec. Rate
                                </p>
                                <p className="text-xl font-black">{order.netLossReport.recoveryRate.toFixed(1)}%</p>
                            </div>
                        </div>
                    )}

                    {!isClosed && (
                        <>
                            <div className="flex items-center justify-between px-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dispatch Items</label>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] uppercase font-black text-muted-foreground border-b border-border">
                                            <th className="pb-2 pl-2">Item</th>
                                            <th className="pb-2 text-center">Sent</th>
                                            <th className="pb-2 text-center">Return</th>
                                            <th className="pb-2 text-center">Damage</th>
                                            <th className="pb-2 text-center">Lost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {items.map((item, index) => {
                                            const remaining = item.qtyDispatched - item.qtyAlreadyReturned;
                                            return (
                                                <tr key={index} className={`group ${!item.selected ? 'opacity-50' : ''}`}>
                                                    <td className="py-3 pl-2">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.selected}
                                                                onChange={e => updateItem(index, "selected", e.target.checked)}
                                                                className="rounded border-border text-primary focus:ring-primary/20"
                                                            />
                                                            <div>
                                                                <div className="text-xs font-bold">{item.name}</div>
                                                                <div className="text-[10px] text-muted-foreground">{remaining} outstanding</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-center text-xs font-bold text-muted-foreground">
                                                        {item.qtyDispatched}
                                                    </td>
                                                    <td className="py-3 px-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={remaining}
                                                            disabled={!item.selected}
                                                            className="w-16 px-2 py-1.5 rounded-lg border border-border bg-card text-xs text-center outline-none focus:ring-2 focus:ring-primary/10 transition-all font-bold"
                                                            value={item.qtyReturned}
                                                            onChange={e => updateItem(index, "qtyReturned", parseInt(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                    <td className="py-3 px-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={remaining}
                                                            disabled={!item.selected}
                                                            className="w-16 px-2 py-1.5 rounded-lg border border-border bg-card text-xs text-center outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-bold text-rose-600"
                                                            value={item.qtyDamaged}
                                                            onChange={e => updateItem(index, "qtyDamaged", parseInt(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                    <td className="py-3 px-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={remaining}
                                                            disabled={!item.selected}
                                                            className="w-16 px-2 py-1.5 rounded-lg border border-border bg-card text-xs text-center outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-amber-600"
                                                            value={item.qtyMissing}
                                                            onChange={e => updateItem(index, "qtyMissing", parseInt(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Detailed Loss Ledger (Always showing if losses exist) */}
                    {order?.movements?.length > 0 && (
                        <div className="bg-muted/50/50 rounded-xl border border-border overflow-hidden">
                            <div className="px-3 py-2 bg-slate-100/50 border-b border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                Detailed Loss Ledger
                            </div>
                            <div className="divide-y divide-border/50 max-h-[150px] overflow-y-auto">
                                {order.movements.map(m => {
                                    const recovered = m.recoveries?.reduce((sum, r) => sum + r.quantityChange, 0) || 0;
                                    const canRecover = recovered < Math.abs(m.quantityChange);
                                    return (
                                        <div key={m.id} className="p-3 flex items-center justify-between hover:bg-card transition-colors">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">{m.movementType}</span>
                                                    <span className="text-[10px] font-bold text-slate-700">{m.apparel?.name}</span>
                                                </div>
                                                <div className="text-[9px] text-muted-foreground mt-1">
                                                    Lost: {Math.abs(m.quantityChange)} • Recovered: {recovered}
                                                </div>
                                            </div>
                                            {canRecover && (
                                                <button
                                                    type="button"
                                                    onClick={() => setRecoveryMovement(m)}
                                                    className="p-1 px-2 text-[9px] font-black uppercase bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-all shadow-sm"
                                                >
                                                    Recover
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {!isClosed && (
                    <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-blue-800 leading-relaxed">
                            <strong>Ledger Impact:</strong> Items marked as 'Return' will be added back to physical building stock. Items marked as 'Damage' or 'Lost' will be reconciled from custody but will NOT return to available stock.
                        </div>
                    </div>
                )}

                <div className="pt-4 flex gap-3 border-t border-border">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-slate-100 transition-colors"
                    >
                        {isClosed ? "Close" : "Cancel"}
                    </button>
                    {!isClosed && (
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : "Verify & Reconcile"}
                        </button>
                    )}
                </div>
            </form>

            <RecordRecoveryModal
                isOpen={!!recoveryMovement}
                onClose={() => setRecoveryMovement(null)}
                movement={recoveryMovement}
                onSuccess={() => {
                    setRecoveryMovement(null);
                    onSuccess();
                    onClose();
                }}
            />
        </Modal>
    );
}
