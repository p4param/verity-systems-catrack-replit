import { useState, useEffect } from "react";
import { Modal } from "./InventoryUI";
import { useAuth } from "@/lib/auth/auth-context";
import { Loader2, Package, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { clsx } from "clsx";

export default function EventReconciliationModal({ isOpen, onClose, event, onSuccess }: {
    isOpen: boolean;
    onClose: () => void;
    event: any;
    onSuccess: () => void;
}) {
    const { fetchWithAuth } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState<{
        apparelId: number;
        apparelName: string;
        returnedQty: number;
        damagedQty: number;
        lostQty: number;
        allottedQty: number;
    }[]>([]);

    useEffect(() => {
        if (event && event.eventReservations) {
            setResults(event.eventReservations.map((r: any) => ({
                apparelId: r.apparelId,
                apparelName: r.apparel?.name || 'Unknown',
                allottedQty: r.reservedQty,
                returnedQty: r.reservedQty, // Default to all returned
                damagedQty: 0,
                lostQty: 0
            })));
        }
    }, [event]);

    const updateResult = (index: number, field: string, value: number) => {
        const newResults = [...results];
        newResults[index] = { ...newResults[index], [field]: value };
        setResults(newResults);
    };

    const autoFillAll = () => {
        setResults(results.map(r => ({
            ...r,
            returnedQty: r.allottedQty,
            damagedQty: 0,
            lostQty: 0
        })));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Sum must match allotment
        const invalidItems = results.filter(r => (r.returnedQty + r.damagedQty + r.lostQty) !== r.allottedQty);
        if (invalidItems.length > 0) {
            toast.error(`Reconciliation mismatch. Check ${invalidItems[0].apparelName}`);
            return;
        }

        setSubmitting(true);
        try {
            await fetchWithAuth(`/api/inventory/events/${event.id}/reconcile`, {
                method: "POST",
                body: JSON.stringify({ results })
            });
            toast.success("Event reconciled and closed successfully");
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to reconcile event");
        } finally {
            setSubmitting(false);
        }
    };

    if (!event) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Reconcile Event: ${event.name}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-3 flex-1">
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                        <p className="text-[10px] text-amber-800 leading-tight font-medium">
                            Account for all <strong>{results.reduce((acc, r) => acc + r.allottedQty, 0)}</strong> allotted items.
                            Damages/Losses permanently reduce stock.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={autoFillAll}
                        className="ml-4 text-[10px] font-bold text-primary hover:underline border border-primary/20 px-3 py-2 rounded-lg bg-primary/5 whitespace-nowrap"
                    >
                        Auto-fill All Returned
                    </button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {results.map((res, idx) => {
                        const totalAccounted = res.returnedQty + res.damagedQty + res.lostQty;
                        const isMismatch = totalAccounted !== res.allottedQty;

                        return (
                            <div key={res.apparelId} className={clsx(
                                "p-4 rounded-xl border transition-all",
                                isMismatch ? "border-rose-200 bg-rose-50/20" : "border-border bg-muted/30"
                            )}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-bold text-sm">{res.apparelName}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Sent: {res.allottedQty}</span>
                                        <span className={clsx(
                                            "text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded",
                                            isMismatch ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                                        )}>
                                            Remaining: {res.allottedQty - totalAccounted}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase tracking-tighter text-emerald-600 block">Returned</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={res.allottedQty}
                                            value={res.returnedQty}
                                            onChange={e => updateResult(idx, 'returnedQty', parseInt(e.target.value) || 0)}
                                            className="w-full px-2 py-1.5 rounded-lg border border-emerald-100 bg-card text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase tracking-tighter text-amber-600 block">Damaged</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={res.allottedQty}
                                            value={res.damagedQty}
                                            onChange={e => updateResult(idx, 'damagedQty', parseInt(e.target.value) || 0)}
                                            className="w-full px-2 py-1.5 rounded-lg border border-amber-100 bg-card text-sm focus:ring-2 focus:ring-amber-500/20 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase tracking-tighter text-rose-600 block">Lost</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={res.allottedQty}
                                            value={res.lostQty}
                                            onChange={e => updateResult(idx, 'lostQty', parseInt(e.target.value) || 0)}
                                            className="w-full px-2 py-1.5 rounded-lg border border-rose-100 bg-card text-sm focus:ring-2 focus:ring-rose-500/20 outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col justify-end">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newResults = [...results];
                                                newResults[idx] = { ...newResults[idx], returnedQty: res.allottedQty, damagedQty: 0, lostQty: 0 };
                                                setResults(newResults);
                                            }}
                                            className="h-[34px] px-2 text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors"
                                        >
                                            All Returned
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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
                        className="flex-2 bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : "Complete Reconciliation"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
