"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateView, useUpdateView } from "@/modules/platform/configuration/hooks/use-views";
import { createViewDtoSchema, CreateViewDto, ViewTypeEnum } from "@/modules/platform/configuration/validations/view-validation";

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateViewDto>({
    resolver: zodResolver(createViewDtoSchema),
    defaultValues: {
      code: "",
      name: "",
      viewType: "GRID",
      isDefault: false,
    },
  });

  useEffect(() => {
    if (open) {
      if (isNew) {
        reset({
          code: "",
          name: "",
          viewType: "GRID",
          isDefault: false,
          columns: [],
          filters: [],
          sorting: [],
        });
      } else if (initialData) {
        reset({
          code: initialData.code,
          name: initialData.name,
          viewType: initialData.viewType,
          isDefault: initialData.isDefault,
          columns: initialData.columns || [],
          filters: initialData.filters || [],
          sorting: initialData.sorting || [],
        });
      }
    }
  }, [open, isNew, initialData, reset]);

  const onSubmit = async (data: CreateViewDto) => {
    try {
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

  const content = (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isNew ? "Create View" : "Edit View"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-4">
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

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">View Type</label>
              <select
                {...register("viewType")}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                {viewTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              {errors.viewType && <p className="text-rose-500 text-xs mt-1">{errors.viewType.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isDefaultView" {...register("isDefault")} className="w-4 h-4" />
              <label htmlFor="isDefaultView" className="text-sm">Set as Default View</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : (
                <>
                  <Check size={16} />
                  {isNew ? "Create View" : "Save Changes"}
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
