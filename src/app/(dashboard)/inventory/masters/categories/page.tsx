"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import CategoryFormModal from "./CategoryFormModal";

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
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
            const data = await fetchWithAuth("/api/masters/categories?includeInactive=true");
            setCategories(data || []);
        } catch (error) {
            console.error("Failed to load apparel categories", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to disable this category?")) return;
        try {
            await fetchWithAuth(`/api/masters/categories/${id}`, { method: "DELETE" });
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
                    <h1 className="text-2xl font-bold text-foreground">Apparel Categories</h1>
                    <p className="text-sm text-muted-foreground">Manage categories used to group and classify apparel assets.</p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2 text-sm font-medium"
                    >
                        <Plus size={16} /> New Category
                    </button>
                )}
            </div>

            <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {loading ? (
                            <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-muted-foreground">Loading...</td></tr>
                        ) : categories.length === 0 ? (
                            <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-muted-foreground">No categories found.</td></tr>
                        ) : categories.map(category => (
                            <tr key={category.id} className={!category.isActive ? "opacity-60" : ""}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{category.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                    {category.isActive ? (
                                        <span className="text-green-600 font-medium">Active</span>
                                    ) : (
                                        <span className="text-red-500">Inactive</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(category)}
                                            className="text-muted-foreground hover:text-blue-600"
                                            title="View / Edit"
                                        >
                                            {canUpdate ? <Pencil size={18} /> : <Eye size={18} />}
                                        </button>

                                        {canDelete && category.isActive && (
                                            <button
                                                onClick={() => handleDelete(category.id)}
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
                <CategoryFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    initialData={editingItem}
                    onSaved={loadData}
                />
            )}
        </div>
    );
}
