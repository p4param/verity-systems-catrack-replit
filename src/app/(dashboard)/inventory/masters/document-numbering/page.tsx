"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Pencil, Eye } from "lucide-react";
import DocumentNumberingFormModal from "./DocumentNumberingFormModal";

export default function DocumentNumberingPage() {
    const [numberings, setNumberings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const { fetchWithAuth, user } = useAuth();

    // Note: Document numbering entries are seeded. We do not allow creation/deletion.
    const canUpdate = user?.permissions?.includes("INVENTORY_MASTER_UPDATE");

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchWithAuth("/api/masters/document-numbering");
            setNumberings(data || []);
        } catch (error) {
            console.error("Failed to load document numberings", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleEdit = (item) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Document Numbering</h1>
                    <p className="text-sm text-muted-foreground">Configure prefixes and sequence formats for system-generated documents.</p>
                </div>
            </div>

            <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Document Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Prefix</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Next Sequence</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider ml-4">Year Suffix</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-muted-foreground">Loading...</td></tr>
                        ) : numberings.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-muted-foreground">No document numbering configurations found.</td></tr>
                        ) : numberings.map(doc => (
                            <tr key={doc.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{doc.entityType}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-mono">{doc.prefix}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">{doc.currentSequence}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground pl-4">
                                    {doc.resetYearly ? (
                                        <span className="text-green-600">Enabled (-YY)</span>
                                    ) : (
                                        <span className="text-muted-foreground">Disabled</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleEdit(doc)}
                                        className="text-muted-foreground hover:text-blue-600"
                                        title="View / Edit"
                                    >
                                        {canUpdate ? <Pencil size={18} /> : <Eye size={18} />}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && editingItem && (
                <DocumentNumberingFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    initialData={editingItem}
                    onSaved={loadData}
                />
            )}
        </div>
    );
}
