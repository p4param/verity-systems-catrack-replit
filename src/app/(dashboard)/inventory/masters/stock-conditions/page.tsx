"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import StockConditionFormModal from "./StockConditionFormModal";

export default function StockConditionsPage() {
    const [conditions, setConditions] = useState([]);
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
            const data = await fetchWithAuth("/api/masters/stock-conditions?includeInactive=true");
            setConditions(data || []);
        } catch (error) {
            console.error("Failed to load stock conditions", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to disable this condition?")) return;
        try {
            await fetchWithAuth(`/api/masters/stock-conditions/${id}`, { method: "DELETE" });
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
                    <h1 className="text-2xl font-bold text-foreground">Stock Conditions</h1>
                    <p className="text-sm text-muted-foreground">Manage quality states and lifecycle stages of inventory.</p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2 text-sm font-medium"
                    >
                        <Plus size={16} /> New Condition
                    </button>
                )}
            </div>

            <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-muted-foreground">Loading...</td></tr>
                        ) : conditions.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-muted-foreground">No conditions found.</td></tr>
                        ) : conditions.map(condition => (
                            <tr key={condition.id} className={!condition.isActive ? "opacity-60" : ""}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{condition.code}</td>
                                <td className="px-6 py-4 text-sm text-muted-foreground max-w-md truncate">{condition.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                    {condition.isActive ? (
                                        <span className="text-green-600 font-medium">Active</span>
                                    ) : (
                                        <span className="text-red-500">Inactive</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(condition)}
                                            className="text-muted-foreground hover:text-blue-600"
                                            title="View / Edit"
                                        >
                                            {canUpdate ? <Pencil size={18} /> : <Eye size={18} />}
                                        </button>

                                        {canDelete && condition.isActive && condition.code !== "CLEAN" && condition.code !== "DIRTY" && (
                                            <button
                                                onClick={() => handleDelete(condition.id)}
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
                <StockConditionFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    initialData={editingItem}
                    onSaved={loadData}
                />
            )}
        </div>
    );
}
