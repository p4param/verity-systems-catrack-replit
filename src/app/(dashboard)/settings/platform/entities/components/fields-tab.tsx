"use client";

import React, { useState } from "react";
import { useFields, useDeleteField } from "@/modules/platform/configuration/hooks/use-fields";
import { Loader2, Plus, Edit, Trash2, ArrowUpDown } from "lucide-react";
import { FieldDialog } from "./field-dialog";
import { toast } from "sonner";

interface FieldsTabProps {
  entityId: string;
}

export function FieldsTab({ entityId }: FieldsTabProps) {
  const { data: fields = [], isLoading } = useFields(entityId);
  const deleteMutation = useDeleteField(entityId);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldData, setEditingFieldData] = useState<any>(null);

  const handleCreate = () => {
    setEditingFieldId(null);
    setEditingFieldData(null);
    setDialogOpen(true);
  };

  const handleEdit = (field: any) => {
    setEditingFieldId(field.id);
    setEditingFieldData(field);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete the field ${code}? This may result in data loss if records already use this field.`)) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Field deleted");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete field");
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
          <h3 className="text-lg font-bold">Field Definitions</h3>
          <p className="text-sm text-muted-foreground">Manage the metadata schema for this entity.</p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"
        >
          <Plus size={16} /> Add Field
        </button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-background">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Label</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">UI Control</th>
              <th className="px-4 py-3 font-semibold">Flags</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No fields defined yet.
                </td>
              </tr>
            ) : (
              fields.map((field: any) => (
                <tr key={field.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <ArrowUpDown size={14} /> {field.displayOrder}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{field.code}</td>
                  <td className="px-4 py-3 font-medium">{field.label}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{field.dataType}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{field.uiControl}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {field.required && <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[10px] font-bold">REQ</span>}
                      {field.unique && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold">UNIQ</span>}
                      {field.searchable && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-bold">SRCH</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(field)}
                        className="p-1.5 text-muted-foreground hover:text-primary rounded hover:bg-muted"
                        title="Edit Field"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(field.id, field.code)}
                        className="p-1.5 text-muted-foreground hover:text-rose-500 rounded hover:bg-rose-500/10"
                        title="Delete Field"
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

      <FieldDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entityId={entityId}
        fieldId={editingFieldId}
        initialData={editingFieldData}
      />
    </div>
  );
}
