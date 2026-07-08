import { useState } from "react";
import { Modal } from "./InventoryUI";
import { useAuth } from "@/lib/auth/auth-context";
import { Loader2, Package, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function RecordRecoveryModal({ isOpen, onClose, movement, onSuccess }: {
    isOpen: boolean;
    onClose: () => void;
    movement: any;
    onSuccess: () => void;
}) {
    const { fetchWithAuth } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [condition, setCondition] = useState<'CLEAN' | 'DIRTY'>('CLEAN');
    const [reason, setReason] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await fetchWithAuth(`/api/inventory/movements/${movement.id}/recovery`, {
                method: "POST",
                body: JSON.stringify({
                    quantity,
                    condition,
                    reason
                })
            });
            toast.success("Stock recovery recorded successfully");
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to record recovery");
        } finally {
            setSubmitting(false);
        }
    };

    if (!movement) return null;

    const remainingToRecover = Math.abs(movement.quantityChange) - (movement.recoveries?.reduce((sum: number, r: any) => sum + r.quantityChange, 0) || 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Record Asset Recovery">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                    <div className="text-[11px] text-emerald-800 leading-relaxed font-medium">
                        You are recovering stock for <strong>{movement.apparel?.name}</strong> originally marked as <strong>{movement.movementType}</strong>.
                        This will increase the physical balance and add a recovery audit entry.
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recovery Quantity</label>
                        <input
                            type="number"
                            min="1"
                            max={remainingToRecover}
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            required
                        />
                        <p className="text-[10px] text-muted-foreground italic">Max available to recover: {remainingToRecover}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Physical Condition</label>
                        <select
                            value={condition}
                            onChange={(e) => setCondition(e.target.value as any)}
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                            <option value="CLEAN">CLEAN (Ready for use)</option>
                            <option value="DIRTY">DIRTY (Needs Laundry)</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason / Context</label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Found in guest room after event clearance"
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm min-h-[100px] focus:ring-2 focus:ring-primary/20 outline-none"
                        required
                    />
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
                        disabled={submitting || quantity <= 0 || quantity > remainingToRecover || !reason.trim()}
                        className="flex-2 bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : "Confirm Recovery"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
