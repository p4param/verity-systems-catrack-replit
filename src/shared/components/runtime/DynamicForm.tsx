"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRouter } from "next/navigation";

interface DynamicFormProps {
  manifest: RuntimeManifest;
  initialData?: any;
  onSubmit: (data: any) => void;
  isSaving: boolean;
}

import { ControlRegistry, DiagnosticControl } from "./registry/UIControlRegistry";
import { FieldControlRegistry } from "@/modules/platform/configuration/registry/field-control-registry";
export function DynamicForm({ manifest, initialData, onSubmit, isSaving }: DynamicFormProps) {
  const router = useRouter();

  const defaultValues = useMemo(() => {
    const defaults: Record<string, any> = {};
    manifest.fields.forEach(f => {
      if (f.defaultValue !== undefined && f.defaultValue !== null) {
        if (f.dataType === "NUMBER" || f.dataType === "DECIMAL") {
          defaults[f.code] = Number(f.defaultValue);
        } else if (f.dataType === "BOOLEAN") {
          defaults[f.code] = f.defaultValue === "true";
        } else if (f.uiControl === "MULTI_SELECT" || f.uiControl === "MULTI_LOOKUP") {
          try {
            defaults[f.code] = typeof f.defaultValue === "string" ? JSON.parse(f.defaultValue) : f.defaultValue;
          } catch(e) {
            defaults[f.code] = [];
          }
        } else {
          defaults[f.code] = f.defaultValue;
        }
      } else if (f.uiControl === "MULTI_SELECT" || f.uiControl === "MULTI_LOOKUP") {
        defaults[f.code] = [];
      } else {
        defaults[f.code] = ""; // Ensure react-hook-form tracks it
      }
    });

    if (initialData) {
      Object.assign(defaults, initialData);
    }
    
    return defaults;
  }, [manifest.fields, initialData]);

  const form = useForm({
    defaultValues
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  // TODO: Switch to layoutViews when ready
  const dataViews = manifest.presentation?.dataViews || [];
  const formView = dataViews.find(v => v.code === manifest.presentation?.defaultLayoutView || v.viewType === "FORM");
  const formLayout = formView?.columns ? (Array.isArray(formView.columns) ? formView.columns : JSON.parse(formView.columns as unknown as string)) : null;

  const renderFields = formLayout && formLayout.length > 0 
    ? formLayout.map((col: any) => manifest.fields.find(f => f.code === col.field)).filter(Boolean)
    : manifest.fields;

  const layoutClass = "grid grid-cols-1 gap-6";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => {
        console.log("Submitting dynamic form data:", data);
        onSubmit(data);
      })} className="space-y-6 max-w-2xl">
        <div className={layoutClass}>
          {renderFields.map((field: any) => {
            const isRequired = field.required;
            const label = field.label || field.code;
            const isHidden = field.metadata?.isHidden;
            const isReadOnly = field.metadata?.isReadOnly;

            if (isHidden) return null;

            const controlDef = FieldControlRegistry.getControl(field.uiControl);
            const renderer = controlDef?.runtime?.renderer;
            const ControlComponent = renderer && ControlRegistry[renderer] 
              ? ControlRegistry[renderer] 
              : DiagnosticControl;

            return (
              <FormField
                key={field.id}
                control={form.control}
                name={field.code}
                rules={{ required: isRequired ? "Required" : false }}
                render={({ field: controllerField }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      {label}
                      {isRequired && <span className="text-rose-500">*</span>}
                    </FormLabel>
                    <FormControl>
                      <ControlComponent
                        field={field}
                        value={controllerField.value}
                        onChange={controllerField.onChange}
                        disabled={isReadOnly}
                        recordData={initialData}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
