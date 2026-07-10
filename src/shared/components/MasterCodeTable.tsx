"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Plus, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Item {
  id: string;
  name: string;
  code: string;
  createdAt?: string;
}

interface Props {
  title: string;
  description: string;
  apiPath: string;
  icon: React.ReactNode;
  codeHelp?: string;
}

export default function MasterCodeTable({ title, description, apiPath, icon, codeHelp }: Props) {
  const { fetchWithAuth, user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreate = user?.permissions?.includes("INVENTORY_MASTER_CREATE");
  const canUpdate = user?.permissions?.includes("INVENTORY_MASTER_UPDATE");
  const canDelete = user?.permissions?.includes("INVENTORY_MASTER_DELETE");

  const load = useCallback(async () => {
    try {
      const data = await fetchWithAuth(apiPath);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await fetchWithAuth(`${apiPath}/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
        toast.success(`${title.replace(" Master", "")} updated`);
      } else {
        await fetchWithAuth(apiPath, {
          method: "POST",
          body: JSON.stringify(formData),
        });
        toast.success(`${title.replace(" Master", "")} created`);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "", code: "" });
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setFormData({ name: item.name, code: item.code });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetchWithAuth(`${apiPath}/${id}`, { method: "DELETE" });
      toast.success("Deleted successfully");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", code: "" });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        {canCreate && !showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: "", code: "" }); }}
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl hover:bg-primary/90 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"
          >
            <Plus size={16} /> Add New
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-muted/40 border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3 text-foreground">
            {editingId ? "Edit Item" : "New Item"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Wedding Ceremony"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Code * {codeHelp && <span className="text-muted-foreground/70">({codeHelp})</span>}
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                placeholder="e.g. WEDDING"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-1.5"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5 font-semibold disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
              <th className="relative px-6 py-3.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-muted-foreground">
                  <Loader2 size={20} className="animate-spin mx-auto mb-2 text-primary" />
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No items found. {canCreate && <button onClick={() => setShowForm(true)} className="text-primary hover:underline font-medium">Add the first one.</button>}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4 text-sm font-semibold text-foreground">{item.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-xs font-mono font-bold bg-primary/10 text-primary rounded-lg border border-primary/20">
                      {item.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canUpdate && (
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-muted-foreground hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          {deletingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer count */}
        {!loading && items.length > 0 && (
          <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{items.length} record{items.length !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}
