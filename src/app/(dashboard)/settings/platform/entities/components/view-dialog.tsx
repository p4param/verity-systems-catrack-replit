"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPortal } from "react-dom";
import { X, Check, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateView, useUpdateView } from "@/modules/platform/configuration/hooks/use-views";
import { useFields } from "@/modules/platform/configuration/hooks/use-fields";
import { createViewDtoSchema, CreateViewDto, ViewTypeEnum, ViewScopeEnum, FilterOperatorEnum } from "@/modules/platform/configuration/validations/view-validation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  viewId?: string | null;
  initialData?: any;
}

export function ViewDialog({ open, onOpenChange, entityId, viewId, initialData }: ViewDialogProps) {
  const isNew = !viewId;

  const createView = useCreateView(entityId);
  const updateView = useUpdateView(entityId);
  const { data: fields } = useFields(entityId);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createViewDtoSchema),
    defaultValues: {
      code: "DEFAULT_GRID",
      name: "Default Grid",
      viewType: "GRID",
      isDefault: true,
      metadata: {
        scope: "PUBLIC",
        columns: [],
        sorting: [],
        defaultSearchFields: [],
        filters: { logic: "AND", conditions: [] }
      },
    },
  });

  const { fields: columnFields, append: appendColumn, remove: removeColumn } = useFieldArray({ control, name: "metadata.columns" });
  const { fields: sortFields, append: appendSort, remove: removeSort } = useFieldArray({ control, name: "metadata.sorting" });
  
  // Basic flat conditions for MVP. Nested groups require recursive components.
  const { fields: filterConditions, append: appendFilter, remove: removeFilter } = useFieldArray({ control, name: "metadata.filters.conditions" as any });

  useEffect(() => {
    if (open) {
      if (isNew) {
        reset({
          code: "DEFAULT_GRID",
          name: "Default Grid",
          viewType: "GRID",
          isDefault: true,
          metadata: {
            scope: "PUBLIC",
            columns: [],
            sorting: [],
            defaultSearchFields: [],
            filters: { logic: "AND", conditions: [] }
          },
        });
      } else if (initialData) {
        reset({
          code: initialData.code,
          name: initialData.name,
          viewType: initialData.viewType,
          isDefault: initialData.isDefault,
          metadata: {
            scope: initialData.metadata?.scope || "PUBLIC",
            columns: initialData.metadata?.columns || [],
            sorting: initialData.metadata?.sorting || [],
            defaultSearchFields: initialData.metadata?.defaultSearchFields || [],
            filters: initialData.metadata?.filters || { logic: "AND", conditions: [] }
          },
        });
      }
    }
  }, [open, isNew, initialData, reset]);

  // Auto-generate view code from name
  const nameValue = watch("name");
  useEffect(() => {
    if (isNew && nameValue) {
      let generated = nameValue
        .toUpperCase()
        .replace(/[^A-Z0-9\s_]/g, "")
        .trim()
        .replace(/\s+/g, "_")
        .substring(0, 50);
      if (/^[0-9_]/.test(generated)) {
        generated = "V_" + generated;
      }
      if (generated.length >= 2) {
        setValue("code", generated);
      }
    }
  }, [nameValue, isNew, setValue]);

  const onSubmit = async (data: any) => {
    try {
      // Fix displayOrders automatically before submit
      if (data.metadata?.columns) {
        data.metadata.columns.forEach((c, idx) => c.displayOrder = idx);
      }
      if (data.metadata?.sorting) {
        data.metadata.sorting.forEach((s, idx) => s.sequence = idx + 1);
      }
      
      if (isNew) {
        await createView.mutateAsync(data);
      } else {
        await updateView.mutateAsync({ id: viewId!, data });
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error("View save error:", error);
      alert(error.message);
    }
  };


  const viewTypes = ViewTypeEnum.options;
  const viewScopes = ViewScopeEnum.options;
  const operators = FilterOperatorEnum.options;

  const content = (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isNew ? "Create Data View" : "Edit Data View"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="columns">Columns</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="sorting">Sorting</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto p-1 py-4">
              <TabsContent value="general" className="space-y-4 m-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">View Code (Unique)</label>
                    <input
                      {...register("code")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      placeholder="e.g. DEFAULT_GRID"
                      disabled={!isNew}
                    />
                    {errors.code && <p className="text-rose-500 text-xs mt-1">{errors.code.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">View Name</label>
                    <input
                      {...register("name")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      placeholder="e.g. Main Grid"
                    />
                    {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">View Type</label>
                    <select
                      {...register("viewType")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    >
                      {viewTypes.map((t) => (
                        <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Scope</label>
                    <select
                      {...register("metadata.scope")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    >
                      {viewScopes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input type="checkbox" id="isDefaultView" {...register("isDefault")} className="w-4 h-4" />
                  <label htmlFor="isDefaultView" className="text-sm font-medium">Set as Default View</label>
                </div>
              </TabsContent>

              <TabsContent value="columns" className="space-y-4 m-0">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold">Selected Columns</label>
                  <button type="button" onClick={() => appendColumn({ field: "", displayOrder: columnFields.length, visible: true, sortable: true, filterable: true, searchable: true, pinned: "none" })} className="text-xs flex items-center gap-1 text-primary hover:underline">
                    <Plus size={14} /> Add Column
                  </button>
                </div>
                
                <div className="space-y-2">
                  {columnFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center bg-muted/30 p-2 rounded-lg border border-border">
                      <select {...register(`metadata.columns.${index}.field`)} className="flex-1 px-2 py-1.5 text-sm rounded bg-background border border-border">
                        <option value="">Select Field...</option>
                        {fields?.map((f: any) => <option key={f.code} value={f.code}>{f.label} ({f.code})</option>)}
                      </select>
                      <input {...register(`metadata.columns.${index}.header`)} placeholder="Header (optional)" className="w-32 px-2 py-1.5 text-sm rounded bg-background border border-border" />
                      <select {...register(`metadata.columns.${index}.pinned`)} className="w-24 px-2 py-1.5 text-sm rounded bg-background border border-border">
                        <option value="none">Unpinned</option>
                        <option value="left">Pin Left</option>
                        <option value="right">Pin Right</option>
                      </select>
                      <button type="button" onClick={() => removeColumn(index)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {columnFields.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No columns added. (All fields will be shown by default if empty).</p>}
                </div>
                
                <div className="pt-4 border-t border-border mt-4">
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Default Quick Search Fields (Comma separated codes)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. CODE, NAME" 
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    onChange={(e) => setValue("metadata.defaultSearchFields", e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    defaultValue={watch("metadata.defaultSearchFields")?.join(", ")}
                  />
                </div>
              </TabsContent>

              <TabsContent value="filters" className="space-y-4 m-0">
                 <div className="flex justify-between items-center">
                  <label className="text-sm font-bold">Default Filters</label>
                  <button type="button" onClick={() => appendFilter({ field: "", operator: "equals", value: "" })} className="text-xs flex items-center gap-1 text-primary hover:underline">
                    <Plus size={14} /> Add Filter
                  </button>
                </div>
                
                <div className="space-y-2">
                  {filterConditions.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center bg-muted/30 p-2 rounded-lg border border-border">
                      <select {...register(`metadata.filters.conditions.${index}.field` as any)} className="w-1/3 px-2 py-1.5 text-sm rounded bg-background border border-border">
                        <option value="">Select Field...</option>
                        {fields?.map((f: any) => <option key={f.code} value={f.code}>{f.label} ({f.code})</option>)}
                      </select>
                      <select {...register(`metadata.filters.conditions.${index}.operator` as any)} className="w-1/3 px-2 py-1.5 text-sm rounded bg-background border border-border">
                        {operators.map(op => <option key={op} value={op}>{op}</option>)}
                      </select>
                      <input {...register(`metadata.filters.conditions.${index}.value` as any)} placeholder="Value" className="w-1/3 px-2 py-1.5 text-sm rounded bg-background border border-border" />
                      <button type="button" onClick={() => removeFilter(index)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {filterConditions.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No default filters.</p>}
                </div>
              </TabsContent>

              <TabsContent value="sorting" className="space-y-4 m-0">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold">Default Sort Order</label>
                  <button type="button" onClick={() => appendSort({ field: "", direction: "ASC", sequence: sortFields.length + 1 })} className="text-xs flex items-center gap-1 text-primary hover:underline">
                    <Plus size={14} /> Add Sort
                  </button>
                </div>
                
                <div className="space-y-2">
                  {sortFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center bg-muted/30 p-2 rounded-lg border border-border">
                      <div className="text-xs font-bold w-6 text-center text-muted-foreground">{index + 1}</div>
                      <select {...register(`metadata.sorting.${index}.field`)} className="flex-1 px-2 py-1.5 text-sm rounded bg-background border border-border">
                        <option value="">Select Field...</option>
                        {fields?.map((f: any) => <option key={f.code} value={f.code}>{f.label} ({f.code})</option>)}
                      </select>
                      <select {...register(`metadata.sorting.${index}.direction`)} className="w-32 px-2 py-1.5 text-sm rounded bg-background border border-border">
                        <option value="ASC">Ascending</option>
                        <option value="DESC">Descending</option>
                      </select>
                      <button type="button" onClick={() => removeSort(index)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {sortFields.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No default sorting.</p>}
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isSubmitting ? "Saving..." : <><Check size={16} />{isNew ? "Create View" : "Save Changes"}</>}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
