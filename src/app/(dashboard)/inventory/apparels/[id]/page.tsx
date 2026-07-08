"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, StatusBadge } from "@/components/inventory/InventoryUI";
import {
    Shirt,
    Box,
    Calendar,
    Truck,
    History,
    Info,
    ArrowLeft,
    Plus,
    Minus,
    ExternalLink,
    ShieldCheck,
    AlertCircle,
    RotateCcw
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

import { useAuth } from "@/lib/auth/auth-context";
import RecordRecoveryModal from "@/components/inventory/RecordRecoveryModal";

export default function ApparelDetail() {
    const { id } = useParams();
    const { fetchWithAuth } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [recoveryMovement, setRecoveryMovement] = useState<any>(null);

    const refreshData = async () => {
        setLoading(true);
        try {
            const json = await fetchWithAuth(`/api/inventory/apparels/${id}`);
            setData(json);
        } catch (err) {
            console.error("Refresh Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const fetchDetail = async () => {
            try {
                const json = await fetchWithAuth(`/api/inventory/apparels/${id}`);
                if (isMounted) setData(json);
            } catch (err) {
                console.error("Detail Load Error:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchDetail();
        return () => { isMounted = false; };
    }, [id, fetchWithAuth]);

    if (loading) return <div className="p-8 text-center animate-pulse">Retrieving Asset Intelligence...</div>;
    if (!data) return <div className="p-8 text-center text-rose-500">Asset not found or access denied.</div>;

    const { apparel, balances, movements, reservations, netLossReport } = data;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/inventory/apparels" className="p-2 rounded-full hover:bg-white shadow-sm border border-border transition-all">
                    <ArrowLeft size={18} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{apparel.name}</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge type="neutral">{apparel.category.name}</StatusBadge>
                        <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">UID: {apparel.id}</span>
                    </div>
                </div>
            </div>

            {/* Balances Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card title="Total Ownership" value={balances.totalStock} icon={Box} className="border-slate-300 bg-slate-100/30" />
                <Card title="Clean Stock" value={balances.cleanStock} icon={Shirt} className="border-emerald-100 bg-emerald-50/5" />
                <Card title="Dirty Stock" value={balances.dirtyStock} icon={Truck} className="border-amber-100 bg-amber-50/5" />
                <Card title="Reserved" value={balances.reserved} icon={Calendar} />
                <Card title="Allotted" value={balances.allotted} icon={Box} className="border-blue-100 bg-blue-50/5" />
                <Card title="In Laundry" value={balances.inLaundry} icon={Truck} className="border-slate-100 bg-slate-50/5" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                {["overview", "movements", "reservations", "loss_recovery"].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={clsx(
                            "px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2",
                            activeTab === tab
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.replace(/_/g, " ")}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === "overview" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Asset Properties" icon={Info}>
                            <div className="space-y-4 mt-4 text-sm">
                                <div className="flex justify-between py-2 border-b border-border/50">
                                    <span className="text-muted-foreground">Category</span>
                                    <span className="font-semibold">{apparel.category.name}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-border/50">
                                    <span className="text-muted-foreground">Unit of Measure</span>
                                    <span className="font-semibold">{apparel.unit}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-border/50">
                                    <span className="text-muted-foreground">Minimum Stock Level</span>
                                    <span className="font-semibold text-rose-600">{apparel.minStockLevel}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-border/50">
                                    <span className="text-muted-foreground">Unit Value</span>
                                    <span className="font-semibold">${apparel.unitValue || "0.00"}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-muted-foreground">Status</span>
                                    <StatusBadge type={apparel.isActive ? "success" : "neutral"}>{apparel.isActive ? "Active" : "Archived"}</StatusBadge>
                                </div>
                            </div>
                        </Card>
                        <Card title="Availability Intelligence" icon={ShieldCheck}>
                            <div className="space-y-4 mt-4">
                                <div className={clsx(
                                    "p-4 rounded-xl border flex items-center justify-between",
                                    balances.available <= apparel.minStockLevel ? "border-rose-200 bg-rose-50/30" : "border-emerald-200 bg-emerald-50/30"
                                )}>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Net Available for Booking</p>
                                        <p className="text-3xl font-black">{balances.available}</p>
                                    </div>
                                    {balances.available <= apparel.minStockLevel && <AlertCircle className="text-rose-500" size={32} />}
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    Availability is calculated as <code>CleanPhysical - ActiveReservations</code>.
                                    Items at laundry, allotted to events, or marked dirty are excluded.
                                </p>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === "movements" && (
                    <Card title="Ledger History" icon={History}>
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border text-[10px] uppercase text-muted-foreground tracking-widest font-bold">
                                        <th className="pb-3 px-2">Date</th>
                                        <th className="pb-3">Type</th>
                                        <th className="pb-3 text-center">Condition</th>
                                        <th className="pb-3">Change</th>
                                        <th className="pb-3 text-right pr-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {movements.map(m => {
                                        const recoveredAmount = m.recoveries?.reduce((sum, r) => sum + r.quantityChange, 0) || 0;
                                        const originalLoss = Math.abs(m.quantityChange);
                                        const canRecover = (m.movementType === 'MISSING' || m.movementType === 'DAMAGE' || m.movementType === 'PURCHASE_DAMAGE_ON_ARRIVAL') && recoveredAmount < originalLoss;

                                        return (
                                            <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="py-3 px-2 text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</td>
                                                <td className="py-3">
                                                    <div className="flex items-center gap-2">
                                                        {m.quantityChange > 0 ? <Plus size={14} className="text-emerald-500" /> : <Minus size={14} className="text-rose-500" />}
                                                        <span className="font-semibold">{m.movementType.replace(/_/g, " ")}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-center">
                                                    <span className={clsx(
                                                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                        m.condition === 'CLEAN' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                                                    )}>
                                                        {m.condition}
                                                    </span>
                                                </td>
                                                <td className={clsx("py-3 font-bold", m.quantityChange > 0 ? "text-emerald-600" : (m.movementType === 'MISSING' || m.movementType === 'DAMAGE' || m.movementType === 'PURCHASE_DAMAGE_ON_ARRIVAL') ? "text-slate-400" : "text-rose-600")}>
                                                    {m.quantityChange > 0 ? "+" : ""}{m.quantityChange}
                                                    {recoveredAmount > 0 && (
                                                        <span className="ml-2 text-[9px] font-normal text-emerald-600">
                                                            ({recoveredAmount} recovered)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 text-right pr-2">
                                                    {canRecover && (
                                                        <button
                                                            onClick={() => setRecoveryMovement({ ...m, apparel })}
                                                            className="flex items-center gap-1 ml-auto p-1 px-2 text-[10px] uppercase font-black bg-emerald-600 text-white hover:bg-emerald-700 rounded transition-all shadow-sm"
                                                        >
                                                            <RotateCcw size={10} /> Recover
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {activeTab === "reservations" && (
                    <Card title="Active Logical Holds" icon={Calendar}>
                        <div className="space-y-3 mt-4">
                            {reservations.length > 0 ? reservations.map(r => (
                                <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group">
                                            <Calendar size={20} className="group-hover:scale-110 transition-transform" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{r.event.name}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(r.event.eventDate).toLocaleDateString()} • {r.status}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-tight">Reserved</p>
                                            <p className="text-lg font-black text-amber-600">{r.reservedQty}</p>
                                        </div>
                                        <button className="p-2 rounded-lg border border-border hover:border-primary text-muted-foreground hover:text-primary transition-all">
                                            <ExternalLink size={16} />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-12 text-center text-muted-foreground text-sm italic border-2 border-dashed border-border rounded-xl">
                                    No active logical holds for this apparel.
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {activeTab === "loss_recovery" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card title="Gross Loss" value={netLossReport.grossLoss} icon={Minus} className="border-rose-100 bg-rose-50/5" />
                            <Card title="Total Recovered" value={netLossReport.totalRecovered} icon={RotateCcw} className="border-emerald-100 bg-emerald-50/5" />
                            <Card title="Net Loss (Shrink)" value={netLossReport.netLoss} icon={AlertCircle} className="border-amber-100 bg-amber-50/5" />
                            <Card title="Recovery Rate" value={`${netLossReport.recoveryRate.toFixed(1)}%`} icon={ShieldCheck} className="border-blue-100 bg-blue-50/5" />
                        </div>

                        <Card title="Pending Recoveries" icon={RotateCcw}>
                            <div className="mt-4 space-y-3">
                                {movements.filter(m => (m.movementType === 'MISSING' || m.movementType === 'DAMAGE' || m.movementType === 'PURCHASE_DAMAGE_ON_ARRIVAL') && (m.recoveries?.reduce((sum, r) => sum + r.quantityChange, 0) || 0) < Math.abs(m.quantityChange)).map(m => {
                                    const recovered = m.recoveries?.reduce((sum, r) => sum + r.quantityChange, 0) || 0;
                                    const remains = Math.abs(m.quantityChange) - recovered;
                                    return (
                                        <div key={m.id} className="p-4 rounded-xl border border-dashed border-border flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-700 px-2 py-0.5 rounded">
                                                        {m.movementType.replace(/_/g, " ")}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">Recorded on {new Date(m.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="mt-1 text-sm font-bold">Unrecovered: {remains} / {Math.abs(m.quantityChange)} {apparel.unit}</p>
                                            </div>
                                            <button
                                                onClick={() => setRecoveryMovement({ ...m, apparel })}
                                                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary/90 transition-all"
                                            >
                                                Mark Recovered
                                            </button>
                                        </div>
                                    );
                                })}
                                {movements.filter(m => (m.movementType === 'MISSING' || m.movementType === 'DAMAGE' || m.movementType === 'PURCHASE_DAMAGE_ON_ARRIVAL') && (m.recoveries?.reduce((sum, r) => sum + r.quantityChange, 0) || 0) < Math.abs(m.quantityChange)).length === 0 && (
                                    <div className="py-8 text-center text-muted-foreground text-sm italic">
                                        No pending losses available for recovery.
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            <RecordRecoveryModal
                isOpen={!!recoveryMovement}
                onClose={() => setRecoveryMovement(null)}
                movement={recoveryMovement}
                onSuccess={refreshData}
            />
        </div>
    );
}
