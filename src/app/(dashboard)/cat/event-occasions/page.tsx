"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Plus,
  Search,
  Check,
  X,
  Edit2,
  Trash2,
  Zap,
} from "lucide-react";
import { CatOccasionType } from "@/modules/cat/occasion-types/types";

interface EventOccasionForm {
  name: string;
  code: string;
  isActive: boolean;
  showInDiscoveryQuickSelect: boolean;
  displayOrder: number;
}

const DEFAULT_FORM: EventOccasionForm = {
  name: "",
  code: "",
  isActive: true,
  showInDiscoveryQuickSelect: false,
  displayOrder: 1,
};

export default function EventOccasionsPage() {
  const [items, setItems] = useState<CatOccasionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "QUICK_SELECT">("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventOccasionForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url = `/api/cat/occasion-types?query=${encodeURIComponent(searchQuery)}`;
      if (activeFilter === "ACTIVE") url += "&activeOnly=true";
      if (activeFilter === "QUICK_SELECT") url += "&quickSelectOnly=true";

      const res = await fetch(url);
      const data = res.ok ? await res.json().catch(() => ({})) : {};
      if (data?.success && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch (err) {
      console.error("Error loading event occasions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [searchQuery, activeFilter]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      ...DEFAULT_FORM,
      displayOrder: items.length + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: CatOccasionType) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      code: item.code,
      isActive: item.isActive,
      showInDiscoveryQuickSelect: item.showInDiscoveryQuickSelect,
      displayOrder: item.displayOrder,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const url = editingId
        ? `/api/cat/occasion-types/${editingId}`
        : `/api/cat/occasion-types`;
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok || !json?.success) {
        alert(json?.error || "Failed to save event occasion.");
        return;
      }

      if (json.isDuplicate) {
        alert("An existing event occasion matched your entry and has been saved/updated.");
      }

      setModalOpen(false);
      fetchItems();
    } catch (err) {
      console.error("Save event occasion error:", err);
      alert("Unexpected error saving event occasion.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleField = async (item: CatOccasionType, field: "isActive" | "showInDiscoveryQuickSelect") => {
    try {
      const newValue = !item[field];
      const res = await fetch(`/api/cat/occasion-types/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, [field]: newValue } : i))
        );
      }
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete event occasion "${name}"?`)) return;
    try {
      const res = await fetch(`/api/cat/occasion-types/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchItems();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            <Link href="/business-setup" className="hover:text-primary transition">
              Business Setup
            </Link>
            <span>/</span>
            <span className="text-foreground">Event Occasions</span>
          </div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary shrink-0" />
            <span>Event Occasions</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage event occasion masters for discovery workflows and quick choice chips.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Event Occasion</span>
        </button>
      </div>

      {/* Controls: Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search event occasions by name or code..."
            className="w-full text-xs bg-background border border-border/60 rounded-xl py-2 pl-9 pr-3"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-muted/20 p-1 rounded-xl border border-border/30">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeFilter === "ALL"
                ? "bg-card text-foreground shadow-2xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Masters
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("QUICK_SELECT")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
              activeFilter === "QUICK_SELECT"
                ? "bg-amber-500/15 text-amber-700 border border-amber-500/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Quick Select Only</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("ACTIVE")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeFilter === "ACTIVE"
                ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active Only
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Loading event occasions...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <div className="text-sm font-bold text-foreground">No Event Occasions Found</div>
            <div className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add event occasions to power discovery quick choice chips and master lookup search.
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-bold">
                <th className="p-3 w-16 text-center">Order</th>
                <th className="p-3">Occasion Name</th>
                <th className="p-3 text-center">Discovery Quick Select</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition">
                  <td className="p-3 text-center font-extrabold text-foreground/80">
                    {item.displayOrder}
                  </td>
                  <td className="p-3 font-bold text-foreground">
                    <div>{item.name}</div>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleField(item, "showInDiscoveryQuickSelect")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                        item.showInDiscoveryQuickSelect
                          ? "bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/25"
                          : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted"
                      }`}
                    >
                      <Zap className={`w-3 h-3 ${item.showInDiscoveryQuickSelect ? "text-amber-500 fill-amber-500" : ""}`} />
                      <span>{item.showInDiscoveryQuickSelect ? "Quick Select Chip" : "Standard Lookup Only"}</span>
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleField(item, "isActive")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                        item.isActive
                          ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted"
                      }`}
                    >
                      {item.isActive ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 text-muted-foreground" />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-3 text-right pr-4 space-x-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="border-b border-border/40 pb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                {editingId ? "Edit Event Occasion" : "Add Event Occasion"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Occasion Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Destination Wedding"
                  className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground block">Display Order</label>
                <input
                  type="number"
                  min="1"
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, displayOrder: parseInt(e.target.value) || 1 }))
                  }
                  className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showInDiscoveryQuickSelect}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        showInDiscoveryQuickSelect: e.target.checked,
                      }))
                    }
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="font-bold text-foreground">Show in Discovery Quick Select Chips</span>
                </label>
              </div>

              <div className="pt-1 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="font-bold text-foreground">Active Master</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted/40 rounded-xl border border-border/40 transition cursor-pointer"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                disabled={saving || !formData.name.trim()}
              >
                {saving ? "Saving..." : "Save Master"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
