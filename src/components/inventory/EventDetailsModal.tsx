"use client";

import { Modal, StatusBadge } from "./InventoryUI";
import {
    Calendar,
    Clock,
    Package,
    User,
    AlertCircle,
    CheckCircle2,
    CalendarDays,
    Minus,
    RotateCcw,
    Loader2
} from "lucide-react";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { clsx } from "clsx";
import RecordRecoveryModal from "./RecordRecoveryModal";

export default function EventDetailsModal({ isOpen, onClose, event, onSuccess, onReconcile }: {
    isOpen: boolean;
    onClose: () => void;
    event: any;
    onSuccess: () => void;
    onReconcile: () => void;
}) {
    const { fetchWithAuth } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [recoveryMovement, setRecoveryMovement] = useState<any>(null);

    if (!event) return null;

    const handleAllot = async () => {
        setSubmitting(true);
        try {
            await fetchWithAuth(`/api/inventory/events/${event.id}/allotment`, {
                method: "POST",
                body: JSON.stringify({
                    items: event.eventReservations.map((r: any) => ({
                        apparelId: r.apparelId,
                        quantity: r.reservedQty
                    }))
                })
            });
            toast.success("Items physically allotted for event");
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Allotment failed. Check stock levels.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Logical Hold Details">
            <div className="space-y-6">
                {/* Header Information */}
                <div className="bg-muted/50/50 p-4 rounded-xl border border-border">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="text-primary" size={18} />
                            <h3 className="font-bold text-lg">{event.name}</h3>
                        </div>
                        <StatusBadge type={event.status === 'CONFIRMED' ? 'success' : 'neutral'}>
                            {event.status}
                        </StatusBadge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            <span>Event Date: {new Date(event.eventDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock size={14} />
                            <span>Created: {new Date(event.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Reservation list */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Package size={14} /> Reserved Assets ({event.eventReservations?.length || 0})
                    </h4>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                        {event.eventReservations?.map((r: any) => (
                            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:border-primary/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                        {r.reservedQty}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold">{r.apparel?.name}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-tight">
                                            {r.apparel?.category?.name || 'Asset'} • {r.status}
                                        </div>
                                    </div>
                                </div>
                                <StatusBadge type={r.status === 'ACTIVE' ? 'info' : r.status === 'COMPLETED' ? 'success' : 'neutral'}>
                                    {r.status}
                                </StatusBadge>
                            </div>
                        ))}

                        {(!event.eventReservations || event.eventReservations.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground italic text-sm">
                                No specific items reserved for this event hold.
                            </div>
                        )}
                    </div>
                </div>

                {/* System Notes */}
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-800 leading-relaxed">
                        <strong>Logical Hold Note:</strong> These items are marked as unavailable in the Conflict Engine but have not yet been deducted from the physical ledger. Deduction occurs during the Dispatch phase.
                    </div>
                </div>

                {/* Loss & Recovery Summary Panel */}
                {event.netLossReport && event.netLossReport.grossLoss > 0 && (
                    <div className="space-y-4 mt-6 pt-6 border-t border-border">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground flex items-center gap-1.5">
                                    <Minus size={12} className="text-rose-500" /> Gross Loss
                                </p>
                                <p className="text-xl font-black">{event.netLossReport.grossLoss}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground flex items-center gap-1.5">
                                    <RotateCcw size={12} className="text-emerald-500" /> Recovered
                                </p>
                                <p className="text-xl font-black">{event.netLossReport.totalRecovered}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground flex items-center gap-1.5">
                                    <AlertCircle size={12} className="text-amber-500" /> Net Loss
                                </p>
                                <p className="text-xl font-black">{event.netLossReport.netLoss}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground flex items-center gap-1.5">
                                    <CheckCircle2 size={12} className="text-blue-500" /> Rec. Rate
                                </p>
                                <p className="text-xl font-black">{event.netLossReport.recoveryRate.toFixed(1)}%</p>
                            </div>
                        </div>

                        {/* Recent Losses List */}
                        <div className="bg-muted/50/50 rounded-xl border border-border overflow-hidden">
                            <div className="px-3 py-2 bg-slate-100/50 border-b border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                Detailed Loss Ledger
                            </div>
                            <div className="divide-y divide-border/50 max-h-[120px] overflow-y-auto custom-scrollbar">
                                {(event.movements || []).filter(m => m.movementType === 'MISSING' || m.movementType === 'DAMAGE').map(m => {
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
                    </div>
                )}

                <div className="pt-6 flex gap-3 border-t border-border mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-slate-100 transition-colors"
                    >
                        Back
                    </button>

                    {(event.status === 'DRAFT' || event.status === 'CONFIRMED') && (
                        <button
                            onClick={handleAllot}
                            disabled={submitting}
                            className="flex-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : "Allot Items Now"}
                        </button>
                    )}

                    {(event.status === 'ALLOTTED' || event.status === 'ACTIVE') && (
                        <button
                            disabled={submitting || new Date(event.eventDate) > new Date()}
                            onClick={() => {
                                onReconcile();
                                onClose();
                            }}
                            className={clsx(
                                "flex-2 px-8 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg",
                                new Date(event.eventDate) > new Date()
                                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-slate-900 text-white hover:bg-slate-800"
                            )}
                        >
                            {new Date(event.eventDate) > new Date() ? "Reconciliation Opens Today" : "Complete & Reconcile Event"}
                        </button>
                    )}
                </div>
            </div>
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
