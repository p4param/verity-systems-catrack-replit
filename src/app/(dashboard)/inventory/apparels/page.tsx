"use client";

import { useState, useEffect } from "react";
import { Card, StatusBadge } from "@/components/inventory/InventoryUI";
import {
    Search,
    Filter,
    Plus,
    MoreHorizontal,
    ChevronRight,
    Shirt,
    ArrowUpDown
} from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/lib/auth/auth-context";
import CreateApparelModal from "@/components/inventory/CreateApparelModal";

export default function ApparelList() {
    const { fetchWithAuth } = useAuth();
    const [apparels, setApparels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchApparels = async () => {
        try {
            // We use the dashboard API because it includes the derived balances
            const data = await fetchWithAuth("/api/inventory/dashboard");
            setApparels(data);
        } catch (err) {
            console.error("Apparel Load Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        fetchApparels();
        return () => { isMounted = false; };
    }, [fetchWithAuth]);

    const filtered = apparels.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.category.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Scanning Apparel Ledger...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/portal" className="hover:text-foreground hover:underline transition-colors">
                    Inventory Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Apparel Catalog</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Apparel Management</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Manage items, track availability, and view movement history.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                    <Plus size={16} /> New Apparel
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or category..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 flex items-center gap-2 text-sm font-medium transition-colors">
                        <Filter size={16} /> Filters
                    </button>
                    <button className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 flex items-center gap-2 text-sm font-medium transition-colors">
                        <ArrowUpDown size={16} /> Sort
                    </button>
                </div>
            </div>

            {/* Apparel Table */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-muted/50/50 border-b border-border">
                                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Apparel Item</th>
                                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</th>
                                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Clean</th>
                                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Dirty</th>
                                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Reserved</th>
                                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Allotted</th>
                                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">In Laundry</th>
                                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Net Available</th>
                                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filtered.length > 0 ? filtered.map(item => (
                                <tr key={item.id} className="group hover:bg-muted/50/30 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
                                                <Shirt size={20} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm group-hover:text-primary transition-colors">{item.name}</div>
                                                <div className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold">{item.category}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-sm font-bold text-slate-900">{item.totalStock}</td>
                                    <td className="py-4 px-4 text-sm font-medium text-emerald-600">{item.cleanStock}</td>
                                    <td className="py-4 px-4 text-sm font-medium text-amber-900">{item.dirtyStock}</td>
                                    <td className="py-4 px-4 text-sm font-medium text-amber-600">{item.reserved}</td>
                                    <td className="py-4 px-4 text-sm font-medium text-blue-600">{item.allotted}</td>
                                    <td className="py-4 px-4 text-sm font-medium text-slate-600">{item.inLaundry}</td>
                                    <td className="py-4 px-4 text-center">
                                        <StatusBadge type={item.available <= item.minStockLevel ? "danger" : (item.available < 20 ? "warning" : "success")}>
                                            {item.available} {item.unit}
                                        </StatusBadge>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/inventory/apparels/${item.id}`} className="p-2 rounded-md hover:bg-slate-100 text-muted-foreground hover:text-primary transition-all">
                                                <ChevronRight size={18} />
                                            </Link>
                                            <button className="p-2 rounded-md hover:bg-slate-100 text-muted-foreground transition-all">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-muted-foreground italic text-sm">
                                        No apparels found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-medium">Showing {filtered.length} items</p>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 text-xs font-bold border border-border rounded-md bg-card hover:bg-muted/50 transition-colors disabled:opacity-50" disabled>Previous</button>
                        <button className="px-3 py-1 text-xs font-bold border border-border rounded-md bg-card hover:bg-muted/50 transition-colors disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
            </div>

            <CreateApparelModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchApparels}
            />
        </div>
    );
}
