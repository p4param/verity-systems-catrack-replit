"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import MovementTypeFormModal from "./MovementTypeFormModal";

export default function MovementTypesPage() {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const { fetchWithAuth, user } = useAuth();

    const canCreate = user?.permissions?.includes("INVENTORY_MASTER_CREATE");
    const canUpdate = user?.permissions?.includes("INVENTORY_MASTER_UPDATE");
    const canDelete = user?.permissions?.includes("INVENTORY_MASTER_DELETE");

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchWithAuth("/api/masters/movement-types?includeInactive=true");
            setTypes(data || []);
        } catch (error) {
            console.error("Failed to load movement types", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this movement type?")) return;
        try {
            await fetchWithAuth(`/api/masters/movement-types/${id}`, { method: "DELETE" });
            loadData();
        } catch (error) {
            alert(error.message || "Failed to delete");
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Movement Types</h1>
                    <p className="text-sm text-muted-foreground">Manage definitions for inventory transactions.</p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2 text-sm font-medium"
                    >
                        <Plus size={16} /> New Movement Type
                    </button>
                )}
            </div>

            <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Direction</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Stock Impact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">System</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-muted-foreground">Loading...</td></tr>
                        ) : types.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-muted-foreground">No movement types found.</td></tr>
                        ) : types.map(type => (
                            <tr key={type.id} className={!type.isActive ? "opacity-60" : ""}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{type.code}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{type.direction}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                    <div className="flex gap-2">
                                        {type.affectsClean && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Clean</span>}
                                        {type.affectsDirty && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Dirty</span>}
                                        {type.isRecoveryType && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Recovery</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                    {type.isSystemControlled ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-gray-800">
                                            System
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                            Custom
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                    {type.isActive ? (
                                        <span className="text-green-600 font-medium">Active</span>
                                    ) : (
                                        <span className="text-red-500">Inactive</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(type)}
                                            className="text-muted-foreground hover:text-blue-600"
                                            title="View / Edit"
                                        >
                                            {canUpdate && !type.isSystemControlled ? <Pencil size={18} /> : <Eye size={18} />}
                                        </button>

                                        {canDelete && !type.isSystemControlled && type.isActive && (
                                            <button
                                                onClick={() => handleDelete(type.id)}
                                                className="text-muted-foreground hover:text-red-600"
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
                <MovementTypeFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    initialData={editingItem}
                    onSaved={loadData}
                />
            )}
        </div>
    );
}
