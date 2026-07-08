"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Plus, Pencil, Trash2, Building2, CreditCard, Receipt } from "lucide-react";
import { toast } from "sonner";
import VendorFormModal from "./VendorFormModal";

export default function VendorsPage() {
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const { fetchWithAuth, user } = useAuth();

    const canCreate = user?.permissions?.includes("INVENTORY_MASTER_CREATE");
    const canUpdate = user?.permissions?.includes("INVENTORY_MASTER_UPDATE");
    const canDelete = user?.permissions?.includes("INVENTORY_MASTER_DELETE");

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchWithAuth("/api/masters/vendors?includeInactive=true");
            setVendors(data || []);
        } catch (error) {
            console.error("Failed to load vendors", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this vendor?")) return;
        try {
            await fetchWithAuth(`/api/masters/vendors/${id}`, { method: "DELETE" });
            toast.success("Vendor deleted successfully");
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete");
        }
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Laundry Vendors Master</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage partner profiles, tax identifiers, payment terms, and credit limits.</p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                        className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl hover:bg-primary/90 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"
                    >
                        <Plus size={18} /> New Vendor Profile
                    </button>
                )}
            </div>

            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50/80">
                        <tr>
                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendor Name</th>
                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tax ID / GSTIN</th>
                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Terms</th>
                            <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credit Limit</th>
                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</th>
                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="relative px-6 py-3.5"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {loading ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground animate-pulse">Loading vendor profiles...</td></tr>
                        ) : vendors.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">No vendors found in database.</td></tr>
                        ) : vendors.map(vendor => (
                            <tr key={vendor.id} className={`hover:bg-muted/50/50 transition-colors ${!vendor.isActive ? "opacity-60" : ""}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <Building2 size={18} />
                                    </div>
                                    {vendor.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-muted-foreground">{vendor.taxId || '—'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">{vendor.paymentTerms || 'NET30'}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-foreground">
                                    {vendor.creditLimit ? `$${Number(vendor.creditLimit).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                                </td>
                                <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate">{vendor.contactInfo || '—'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs">
                                    {vendor.isActive ? (
                                        <span className="px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700">Active</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded font-semibold bg-rose-50 text-rose-700">Inactive</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-3">
                                        <button
                                            onClick={() => handleEdit(vendor)}
                                            className="text-muted-foreground hover:text-blue-600 transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil size={18} />
                                        </button>

                                        {canDelete && vendor.isActive && (
                                            <button
                                                onClick={() => handleDelete(vendor.id)}
                                                className="text-muted-foreground hover:text-red-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <VendorFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    initialData={editingItem}
                    onSaved={loadData}
                />
            )}
        </div>
    );
}
