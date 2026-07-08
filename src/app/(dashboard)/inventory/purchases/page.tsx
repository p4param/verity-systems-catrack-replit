"use client";

import { useState, useEffect } from "react";
import { Card, StatusBadge } from "@/components/inventory/InventoryUI";
import {
    ShoppingCart,
    Plus,
    ArrowRight,
    History,
    CheckCircle2,
    Clock,
    Package
} from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import CreatePurchaseModal from "@/components/inventory/CreatePurchaseModal";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PurchaseManagement() {
    const { fetchWithAuth } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchOrders = async () => {
        try {
            const data = await fetchWithAuth("/api/inventory/purchases");
            setOrders(data);
        } catch (err) {
            console.error("Purchases Load Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [fetchWithAuth]);

    if (loading) return <div className="p-8 text-center animate-pulse">Loading Purchase Orders...</div>;

    const activeOrders = orders.filter(o => o.status !== 'CLOSED' && o.status !== 'CANCELLED');
    const closedOrders = orders.filter(o => o.status === 'CLOSED' || o.status === 'CANCELLED');

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/portal" className="hover:text-foreground hover:underline transition-colors">
                    Inventory Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Purchase Orders</span>
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Manage inbound stock from suppliers.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
                >
                    <Plus size={16} /> New Purchase Order
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Orders List */}
                <Card title="Active Orders" icon={Clock} className="lg:col-span-2">
                    <div className="space-y-4 mt-4">
                        {activeOrders.map(order => (
                            <div key={order.id} className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-card hover:shadow-sm transition-all group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <ShoppingCart size={24} />
                                        </div>
                                        <div>
                                            <div className="font-bold">{order.supplier.name}</div>
                                            <div className="text-xs text-muted-foreground">PO: {order.poNumber} • Date {new Date(order.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <StatusBadge type={order.status === 'RECEIVED' ? 'success' : order.status === 'ORDERED' ? 'info' : 'warning'}>{order.status}</StatusBadge>
                                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-tighter">Expected: {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        <span className="text-xs text-muted-foreground">{order.items.length} items</span>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/inventory/purchases/${order.id}`)}
                                        className="text-primary text-xs font-bold flex items-center gap-1 group-hover:underline"
                                    >
                                        View Details <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {activeOrders.length === 0 && (
                            <div className="py-20 text-center text-muted-foreground text-sm italic border-2 border-dashed border-border rounded-xl">
                                No active purchase orders.
                            </div>
                        )}
                    </div>
                </Card>

                {/* Logistics Intelligence */}
                <div className="space-y-6">
                    <Card title="Inbound Integration" icon={CheckCircle2}>
                        <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 mt-2">
                            <p className="text-sm font-semibold text-emerald-800">Ledger Safeguards</p>
                            <p className="text-xs text-emerald-600 mt-1 leading-relaxed">System automates PURCHASE_RECEIVE and PURCHASE_RETURN ledger movements when goods are received or returned.</p>
                        </div>
                    </Card>

                    <Card title="Recent History" icon={History}>
                        <div className="space-y-3 mt-2 max-h-[300px] overflow-y-auto pr-1">
                            {closedOrders.map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => router.push(`/inventory/purchases/${order.id}`)}
                                    className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-card hover:shadow-sm transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-bold truncate max-w-[120px]">{order.supplier.name}</p>
                                            <p className="text-[10px] text-muted-foreground">PO {order.poNumber}</p>
                                        </div>
                                        <div className="text-right">
                                            <StatusBadge type={order.status === 'CANCELLED' ? 'error' : 'success'}>{order.status}</StatusBadge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {closedOrders.length === 0 && (
                                <p className="text-xs text-center text-muted-foreground py-4 italic">No order history available.</p>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {isCreateModalOpen && (
                <CreatePurchaseModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        fetchOrders();
                    }}
                />
            )}
        </div>
    );
}
