"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, LayoutTemplate } from "lucide-react";
import { useViews, useDeleteView } from "@/modules/platform/configuration/hooks/use-views";
import { ViewDialog } from "./view-dialog";

export function ViewsTab({ entityId }: { entityId: string }) {
  const { data: views, isLoading, error } = useViews(entityId);
  const deleteView = useDeleteView(entityId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editingViewData, setEditingViewData] = useState<any>(null);

  const handleCreateNew = () => {
    setEditingViewId(null);
    setEditingViewData(null);
    setDialogOpen(true);
  };

  const handleEdit = (view: any) => {
    setEditingViewId(view.id);
    setEditingViewData(view);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete view '${code}'?`)) {
      try {
        await deleteView.mutateAsync(id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading views...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-rose-500 bg-rose-500/10 rounded-xl border border-rose-500/20">{error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <LayoutTemplate size={20} className="text-primary" />
            Entity Views
          </h3>
          <p className="text-sm text-muted-foreground">Define presentation layouts for this entity.</p>
        </div>
        <button
          type="button"
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add View
        </button>
      </div>

      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium text-center">Default</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!views || views.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No views defined yet.
                </td>
              </tr>
            ) : (
              views.map((view: any) => (
                <tr key={view.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{view.code}</td>
                  <td className="px-4 py-3">{view.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-500 text-xs font-bold">
                      {view.viewType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {view.isDefault && (
                      <span className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-xs font-bold">
                        DEFAULT
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(view)}
                        className="p-1.5 text-muted-foreground hover:text-primary rounded hover:bg-muted"
                        title="Edit View"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(view.id, view.code)}
                        className="p-1.5 text-muted-foreground hover:text-rose-500 rounded hover:bg-rose-500/10"
                        title="Delete View"
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

      <ViewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entityId={entityId}
        viewId={editingViewId}
        initialData={editingViewData}
      />
    </div>
  );
}
