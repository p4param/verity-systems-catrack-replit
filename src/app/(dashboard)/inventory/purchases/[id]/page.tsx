"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Card, StatusBadge } from "@/components/inventory/InventoryUI";
import { ArrowLeft, CheckCircle, Package, ArrowRightLeft, Clock, Info } from "lucide-react";
import ReceiveStockModal from "@/components/inventory/ReceiveStockModal";
import ReturnStockModal from "@/components/inventory/ReturnStockModal";

export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { fetchWithAuth, user } = useAuth();
    const router = useRouter();

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [approving, setApproving] = useState(false);

    const fetchOrder = async () => {
        try {
            const data = await fetchWithAuth(`/api/inventory/purchases/${id}`);
            setOrder(data);
        } catch (err) {
            console.error("Purchase Load Error:", err);
            router.push("/inventory/purchases");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id, fetchWithAuth]);

    const handleApprove = async () => {
        setApproving(true);
        try {
            await fetchWithAuth(`/api/inventory/purchases/${id}/approve`, {
                method: "POST"
            });
            await fetchOrder();
        } catch (err) {
            console.error(err);
            alert("Failed to approve PO");
        } finally {
            setApproving(false);
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading Purchase Order...</div>;
    if (!order) return <div className="p-8 text-center text-rose-500">Order not found.</div>;

    const canApprove = order.status === "DRAFT";
    const canReceive = ["ORDERED", "PARTIALLY_RECEIVED"].includes(order.status);
    const canReturn = ["RECEIVED", "PARTIALLY_RECEIVED"].includes(order.status);

    return (
        <div className="space-y-6">
            <button
                onClick={() => router.push("/inventory/purchases")}
                className="text-sm font-semibold flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Purchases
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        PO: {order.poNumber}
                        <StatusBadge type={order.status === 'RECEIVED' ? 'success' : order.status === 'ORDERED' ? 'info' : 'warning'}>
                            {order.status}
                        </StatusBadge>
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Supplier: <span className="font-semibold text-slate-800">{order.supplier.name}</span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {canApprove && (
                        <button
                            onClick={handleApprove}
                            disabled={approving}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            <CheckCircle size={16} /> Approve PO
                        </button>
                    )}
                    {canReceive && (
                        <button
                            onClick={() => setIsReceiveModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition-all"
                        >
                            <Package size={16} /> Receive Stock
                        </button>
                    )}
                    {canReturn && (
                        <button
                            onClick={() => setIsReturnModalOpen(true)}
                            className="bg-white border text-rose-600 border-rose-200 hover:bg-rose-50 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition-all"
                        >
                            <ArrowRightLeft size={16} /> Return Stock
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-3 h-full">
                    <div className="overflow-x-auto rounded-xl border border-border mt-2">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Apparel</th>
                                    <th className="px-6 py-4 font-semibold text-right">Ordered</th>
                                    <th className="px-6 py-4 font-semibold text-right">Received (Clean)</th>
                                    <th className="px-6 py-4 font-semibold text-right">Damaged</th>
                                    <th className="px-6 py-4 font-semibold text-right">Pending</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item: any) => {
                                    const cleanReceived = item.receivedQty - (item.damagedQty || 0);
                                    return (
                                        <tr key={item.id} className="border-b border-border hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold shrink-0">
                                                    {item.apparel.name[0]}
                                                </div>
                                                {item.apparel.name}
                                            </td>
                                            <td className="px-6 py-4 text-right">{item.orderedQty}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                                                    {cleanReceived}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {item.damagedQty > 0 ? (
                                                    <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold">
                                                        {item.damagedQty}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-amber-600">
                                                {Math.max(0, item.orderedQty - item.receivedQty)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card title="Details" icon={Info}>
                        <div className="space-y-4 mt-4 text-sm">
                            <div>
                                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Created</p>
                                <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Expected</p>
                                <p className="font-medium">{order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : 'Not Set'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Supplier Contact</p>
                                <p className="font-medium">{order.supplier.contactInfo || 'No contact provided'}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {isReceiveModalOpen && (
                <ReceiveStockModal
                    isOpen={isReceiveModalOpen}
                    onClose={() => setIsReceiveModalOpen(false)}
                    order={order}
                    onSuccess={() => {
                        setIsReceiveModalOpen(false);
                        fetchOrder();
                    }}
                />
            )}

            {isReturnModalOpen && (
                <ReturnStockModal
                    isOpen={isReturnModalOpen}
                    onClose={() => setIsReturnModalOpen(false)}
                    order={order}
                    onSuccess={() => {
                        setIsReturnModalOpen(false);
                        fetchOrder();
                    }}
                />
            )}
        </div>
    );
}
