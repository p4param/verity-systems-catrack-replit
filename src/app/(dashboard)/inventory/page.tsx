"use client";

import { useState, useEffect } from "react";
import { Card, StatusBadge } from "@/components/inventory/InventoryUI";
import {
    Box,
    Shirt,
    Calendar,
    Truck,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    History
} from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/lib/auth/auth-context";

export default function InventoryDashboard() {
    const { fetchWithAuth } = useAuth();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchDashboard = async () => {
            try {
                const data = await fetchWithAuth("/api/inventory/dashboard");
                if (isMounted) setStats(data);
            } catch (err) {
                console.error("Dashboard Load Error:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchDashboard();
        return () => { isMounted = false; };
    }, [fetchWithAuth]);

    const totals = stats.reduce((acc, curr) => ({
        physical: acc.physical + curr.physicalStock,
        reserved: acc.reserved + curr.reserved,
        laundry: acc.laundry + curr.inLaundry,
        available: acc.available + curr.available
    }), { physical: 0, reserved: 0, laundry: 0, available: 0 });

    const lowStockItems = stats.filter(s => s.available <= s.minStockLevel);

    if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Inventory Intelligence...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/portal" className="hover:text-foreground hover:underline transition-colors">
                    Inventory Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Overview & Stock</span>
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory Intelligence</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Real-time balances derived from the append-only ledger.</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/inventory/laundry" className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm">
                        <Truck size={16} /> Dispatch Laundry
                    </Link>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card
                    title="Physical Stock"
                    value={totals.physical}
                    icon={Box}
                    trend="+12%"
                    trendType="positive"
                />
                <Card
                    title="Active Reservations"
                    value={totals.reserved}
                    icon={Calendar}
                    trend="Steady"
                />
                <Card
                    title="At Laundry"
                    value={totals.laundry}
                    icon={Truck}
                    trend="-5%"
                    trendType="negative"
                />
                <Card
                    title="Net Availability"
                    value={totals.available}
                    icon={TrendingUp}
                    trend="+8%"
                    trendType="positive"
                    className="border-primary/20 bg-primary/5 shadow-inner"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Low Stock Alerts */}
                <Card title="Critical Stock Alerts" icon={AlertTriangle} className="lg:col-span-1 border-rose-100 bg-rose-50/20">
                    <div className="space-y-4 mt-2">
                        {lowStockItems.length > 0 ? lowStockItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-card shadow-sm border border-rose-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                                        <Shirt size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">{item.name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{item.category}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-rose-600">{item.available} {item.unit}</p>
                                    <p className="text-[10px] text-muted-foreground">Min: {item.minStockLevel}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center py-8 text-muted-foreground text-sm italic">All items are sufficiently stocked.</p>
                        )}
                    </div>
                </Card>

                {/* Performance & Ledger Overview */}
                <Card title="Ledger-Based Aggregate Summary" icon={TrendingUp} className="lg:col-span-2 overflow-hidden h-fit">
                    <table className="w-full text-left mt-2">
                        <thead>
                            <tr className="text-[10px] uppercase text-muted-foreground tracking-tighter border-b border-border/50">
                                <th className="pb-3 pl-2">Apparel</th>
                                <th className="pb-3">Physical</th>
                                <th className="pb-3">Reserved</th>
                                <th className="pb-3">Laundry</th>
                                <th className="pb-3 pr-2 text-right">Available</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {stats.slice(0, 5).map(item => (
                                <tr key={item.id} className="group hover:bg-muted/50/50 transition-colors">
                                    <td className="py-3 px-2">
                                        <div className="font-semibold text-sm">{item.name}</div>
                                        <div className="text-[10px] text-muted-foreground">{item.category}</div>
                                    </td>
                                    <td className="py-3 text-sm font-medium">{item.physicalStock}</td>
                                    <td className="py-3 text-sm font-medium text-amber-600">-{item.reserved}</td>
                                    <td className="py-3 text-sm font-medium text-blue-600">-{item.inLaundry}</td>
                                    <td className="py-3 pr-2 text-right">
                                        <StatusBadge type={item.available <= item.minStockLevel ? "danger" : (item.available < 20 ? "warning" : "success")}>
                                            {item.available} {item.unit}
                                        </StatusBadge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-4 pt-4 border-t border-dashed border-border flex justify-end">
                        <Link href="/inventory/apparels" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 group">
                            View Full Inventory <History size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}
