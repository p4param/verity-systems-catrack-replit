"use client";

import React, { useState } from "react";
import { useLayouts, useDeleteLayout } from "@/modules/platform/configuration/hooks/use-layouts";
import { Loader2, Plus, Edit, Trash2, Layout, Star } from "lucide-react";
import { LayoutDialog } from "./layout-dialog";
import { toast } from "sonner";

interface LayoutViewsTabProps {
  entityId: string;
}

export function LayoutViewsTab({ entityId }: LayoutViewsTabProps) {
  const { data: layouts = [], isLoading } = useLayouts(entityId);
  const deleteMutation = useDeleteLayout(entityId);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
  const [editingLayoutData, setEditingLayoutData] = useState<any>(null);

  const handleCreate = () => {
    setEditingLayoutId(null);
    setEditingLayoutData(null);
    setDialogOpen(true);
  };

  const handleEdit = (layout: any) => {
    setEditingLayoutId(layout.id);
    setEditingLayoutData(layout);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete the layout "${code}"?`)) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Layout deleted");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete layout");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold">Layout Views</h3>
          <p className="text-sm text-muted-foreground">Define how individual records are displayed at runtime.</p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"
        >
          <Plus size={16} /> Add Layout
        </button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-background">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Default</th>
              <th className="px-4 py-3 font-semibold">Version</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {layouts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Layout className="w-8 h-8 opacity-40" />
                    <p>No layout views defined yet.</p>
                    <p className="text-xs">Create a layout to define how records are displayed.</p>
                  </div>
                </td>
              </tr>
            ) : (
              layouts.map((layout: any) => (
                <tr key={layout.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{layout.code}</td>
                  <td className="px-4 py-3 font-medium">{layout.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {layout.layoutType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {layout.isDefault && (
                      <Star size={16} className="text-amber-500 fill-amber-500" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">v{layout.version}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(layout)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(layout.id, layout.code)}
                        className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <LayoutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entityId={entityId}
        layoutId={editingLayoutId}
        initialData={editingLayoutData}
      />
    </div>
  );
}
