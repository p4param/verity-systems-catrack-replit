"use client";

import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFieldDtoSchema } from "@/modules/platform/configuration/validations/field-validation";
import { useCreateField, useUpdateField, useFieldCatalog } from "@/modules/platform/configuration/hooks/use-fields";
import { useEntities } from "@/modules/platform/configuration/hooks/use-entities";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface FieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  fieldId?: string | null;
  initialData?: any;
}

const EMPTY_CATALOG: any[] = [];

export function FieldDialog({ open, onOpenChange, entityId, fieldId, initialData }: FieldDialogProps) {
  const { data: catalog = EMPTY_CATALOG, isLoading: catalogLoading } = useFieldCatalog();
  const createMutation = useCreateField(entityId);
  const updateMutation = useUpdateField(entityId);
  
  const isNew = !fieldId;

  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm({
    resolver: zodResolver(createFieldDtoSchema),
    defaultValues: {
      code: "",
      label: "",
      catalogType: "TEXT",
      required: false,
      unique: false,
      searchable: false,
      sortable: false,
      filterable: false,
      displayOrder: 0
    }
  });

  const catalogType = watch("catalogType");
  const selectedCatalogEntry = catalog.find(c => c.type === catalogType);

  useEffect(() => {
    if (open) {
      if (isNew) {
        reset({
          code: "",
          label: "",
          catalogType: "TEXT",
          required: false,
          unique: false,
          searchable: false,
          sortable: false,
          filterable: false,
          displayOrder: 0,
          dataSource: "STATIC",
          lookupEntity: null,
          options: []
        });
      } else if (initialData) {
        const matchedType = catalog.find(c => c.dataType === initialData.dataType && c.defaultUIControl === initialData.uiControl)?.type || "TEXT";
        
        reset({
          code: initialData.code || "",
          label: initialData.label || "",
          catalogType: matchedType,
          required: initialData.required || false,
          unique: initialData.unique || false,
          searchable: initialData.searchable || false,
          sortable: initialData.sortable || false,
          filterable: initialData.filterable || false,
          displayOrder: initialData.displayOrder || 0,
          dataSource: initialData.dataSource || "STATIC",
          lookupEntity: initialData.lookupEntity || null,
          options: initialData.options || []
        });
      }
    }
  }, [open, isNew, initialData, reset, catalog]);

  const onSubmit = async (data: any) => {
    try {
      if (data.catalogType === "LOOKUP" || data.catalogType === "MULTI_LOOKUP") {
        data.dataSource = "LOOKUP";
      } else {
        data.dataSource = "STATIC";
        data.lookupEntity = null;
      }

      // Auto-generate missing option codes from label
      if (data.options && Array.isArray(data.options)) {
        data.options = data.options.map((opt: any) => {
          if (!opt.code || opt.code.trim() === "") {
            opt.code = opt.label.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
          }
          return opt;
        });
      }

      if (isNew) {
        await createMutation.mutateAsync(data);
        toast.success("Field created successfully");
      } else {
        await updateMutation.mutateAsync({ id: fieldId!, data });
        toast.success("Field updated successfully");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save field");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add Field" : "Edit Field"}</DialogTitle>
        </DialogHeader>
        
        {catalogLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-muted-foreground mb-1">Field Label</label>
                <input
                  {...register("label")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  placeholder="e.g. Customer Name"
                />
                {errors.label && <p className="text-rose-500 text-xs mt-1">{errors.label.message as string}</p>}
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-muted-foreground mb-1">Field Code</label>
                <input
                  {...register("code")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  placeholder="e.g. CUSTOMER_NAME"
                  disabled={!isNew}
                />
                {errors.code && <p className="text-rose-500 text-xs mt-1">{errors.code.message as string}</p>}
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-muted-foreground mb-1">Field Type</label>
                <select
                  {...register("catalogType")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                >
                  {catalog.map(c => (
                    <option key={c.type} value={c.type}>{c.name} ({c.description})</option>
                  ))}
                </select>
                {errors.catalogType && <p className="text-rose-500 text-xs mt-1">{errors.catalogType.message as string}</p>}
              </div>

              {(catalogType === "LOOKUP" || catalogType === "MULTI_LOOKUP") && (
                <div className="col-span-2">
                  <LookupEntitySelect register={register} errors={errors} />
                </div>
              )}

              {(catalogType === "SELECT" || catalogType === "MULTI_SELECT") && (
                <div className="col-span-2 border border-border rounded-lg p-4 bg-muted/20">
                  <FieldOptionsManager form={{ register, control, watch, formState: { errors } } as any} />
                </div>
              )}

              <div className="col-span-2 grid grid-cols-2 gap-4 mt-4 border-t border-border pt-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" {...register("required")} id="field-required" className="w-4 h-4" />
                  <label htmlFor="field-required" className="text-sm font-semibold">Required</label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input type="checkbox" {...register("unique")} id="field-unique" className="w-4 h-4" />
                  <label htmlFor="field-unique" className="text-sm font-semibold">Unique</label>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" {...register("searchable")} id="field-searchable" className="w-4 h-4" />
                  <label htmlFor="field-searchable" className="text-sm font-semibold">Searchable</label>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" {...register("sortable")} id="field-sortable" className="w-4 h-4" />
                  <label htmlFor="field-sortable" className="text-sm font-semibold">Sortable</label>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" {...register("filterable")} id="field-filterable" className="w-4 h-4" />
                  <label htmlFor="field-filterable" className="text-sm font-semibold">Filterable</label>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isNew ? "Create Field" : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Extracted Sub-Components for cleaner code

function LookupEntitySelect({ register, errors }: { register: any; errors: any }) {
  const { data: entities = [], isLoading } = useEntities();
  
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading entities...</p>;

  return (
    <div>
      <label className="block text-xs font-bold text-muted-foreground mb-1">Target Lookup Entity</label>
      <select
        {...register("lookupEntity")}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      >
        <option value="">-- Select Entity --</option>
        {entities.map((ent: any) => (
          <option key={ent.id} value={ent.id}>{ent.name} ({ent.code})</option>
        ))}
      </select>
      {errors.lookupEntity && <p className="text-rose-500 text-xs mt-1">{errors.lookupEntity.message as string}</p>}
    </div>
  );
}

function FieldOptionsManager({ form }: { form: any }) {
  const { register, control, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "options"
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Dropdown Options</h4>
        <button
          type="button"
          onClick={() => append({ code: "", label: "", displayOrder: fields.length, isDefault: false })}
          className="text-xs flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20"
        >
          <Plus className="w-3 h-3" /> Add Option
        </button>
      </div>
      
      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No options added yet.</p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2 bg-background p-2 rounded border border-border">
              <div className="flex-1 space-y-2">
                <input
                  {...register(`options.${index}.label`)}
                  placeholder="Option Label (e.g. In Progress)"
                  className="w-full px-2 py-1 text-sm border border-border rounded"
                />
                <input
                  type="hidden"
                  {...register(`options.${index}.code`)}
                />
              </div>
              <div className="flex flex-col items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-1 text-rose-500 hover:bg-rose-500/10 rounded"
                  title="Remove Option"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {errors.options && <p className="text-rose-500 text-xs mt-1">{errors.options.message as string}</p>}
    </div>
  );
}

