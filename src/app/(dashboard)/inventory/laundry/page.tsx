"use client";

import { useState, useEffect } from "react";
import { Card, StatusBadge } from "@/components/inventory/InventoryUI";
import {
    Truck,
    Plus,
    ArrowRight,
    History,
    CheckCircle2,
    Clock,
    Package,
    AlertCircle
} from "lucide-react";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import CreateDispatchModal from "@/components/inventory/CreateDispatchModal";
import ManageLaundryReturnModal from "@/components/inventory/ManageLaundryReturnModal";

export default function LaundryManagement() {
    const { fetchWithAuth } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchOrders = async () => {
        try {
            const data = await fetchWithAuth("/api/inventory/laundry");
            setOrders(data);
        } catch (err) {
            console.error("Laundry Load Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [fetchWithAuth]);

    if (loading) return <div className="p-8 text-center animate-pulse">Connecting to Logistics Engine...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/portal" className="hover:text-foreground hover:underline transition-colors">
                    Inventory Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Orders & Dispatches</span>
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Laundry Logistics</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Monitor custody transfers and reconcile returned assets.</p>
                </div>
                <button
                    onClick={() => setIsDispatchModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
                >
                    <Plus size={16} /> New Dispatch
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Orders List */}
                <Card title="Active Transfers" icon={Clock} className="lg:col-span-2">
                    <div className="space-y-4 mt-4">
                        {orders.filter(o => o.status !== 'CLOSED').map(order => (
                            <div key={order.id} className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-card hover:shadow-sm transition-all group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <Truck size={24} />
                                        </div>
                                        <div>
                                            <div className="font-bold">{order.vendor.name}</div>
                                            <div className="text-xs text-muted-foreground">Order ID: #{order.id} • Sent {new Date(order.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <StatusBadge type={order.status === 'DISPATCHED' ? 'info' : 'warning'}>{order.status}</StatusBadge>
                                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-tighter">Due: {order.expectedReturnDate ? new Date(order.expectedReturnDate).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        {order.items.slice(0, 3).map(item => (
                                            <div key={item.id} className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-[10px] font-bold shadow-sm" title={item.apparel.name}>
                                                {item.apparel.name[0]}
                                            </div>
                                        ))}
                                        {order.items.length > 3 && (
                                            <div className="w-8 h-8 rounded-full bg-slate-200 border border-border flex items-center justify-center text-[10px] font-bold shadow-sm text-muted-foreground">
                                                +{order.items.length - 3}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className="text-primary text-xs font-bold flex items-center gap-1 group-hover:underline"
                                    >
                                        Manage Return <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {orders.filter(o => o.status !== 'CLOSED').length === 0 && (
                            <div className="py-20 text-center text-muted-foreground text-sm italic border-2 border-dashed border-border rounded-xl">
                                No active laundry transfers.
                            </div>
                        )}
                    </div>
                </Card>

                {/* Logistics Intelligence */}
                <div className="space-y-6">
                    <Card title="Return Reconciliation" icon={CheckCircle2}>
                        <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 mt-2">
                            <p className="text-sm font-semibold text-emerald-800">Operational Integrity</p>
                            <p className="text-xs text-emerald-600 mt-1 leading-relaxed">System automatically validates returned quantities against original dispatch to prevent ledger drift.</p>
                        </div>
                    </Card>

                    <Card title="Recent History" icon={History}>
                        <div className="space-y-3 mt-2 max-h-[300px] overflow-y-auto pr-1">
                            {orders.filter(o => o.status === 'CLOSED').map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => setSelectedOrder(order)}
                                    className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-card hover:shadow-sm transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-bold truncate max-w-[120px]">{order.vendor.name}</p>
                                            <p className="text-[10px] text-muted-foreground">Order #{order.id}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">CLOSED</span>
                                            {order.netLossReport?.grossLoss > 0 && (
                                                <p className="text-[9px] text-rose-500 font-bold mt-1">-{order.netLossReport.grossLoss} Loss</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {orders.filter(o => o.status === 'CLOSED').length === 0 && (
                                <p className="text-xs text-center text-muted-foreground py-4 italic">No order history available.</p>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            <CreateDispatchModal
                isOpen={isDispatchModalOpen}
                onClose={() => setIsDispatchModalOpen(false)}
                onSuccess={fetchOrders}
            />

            <ManageLaundryReturnModal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                order={selectedOrder}
                onSuccess={fetchOrders}
            />
        </div>
    );
}
