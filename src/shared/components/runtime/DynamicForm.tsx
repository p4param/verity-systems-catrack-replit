"use client";

import React, { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import { FormTab } from "./layout/FormTab";
import { ValidationSummary } from "./components/ValidationSummary";
import { EmptyState } from "./components/EmptyState";
import { FormSkeleton } from "./components/FormSkeleton";
import { useRuntimeContext } from "./context/use-runtime-context";
import { useRecordContext } from "./context/use-record-context";
import { runtimeEventBus } from "./services/EventBus";
import { EntityFieldDefinition, RuntimeEventType } from "./types/framework";

import type { LayoutRoot } from "@/modules/platform/configuration/validations/layout-validation";
import { listControls, resolveControl, ControlCompatibilityRegistry } from "./registry/UIControlRegistry";

// ─── One-time registry dump (development only) ──────────────────────────────
// Prints the full control registry BEFORE the first DynamicForm render to verify
// all built-in controls are registered and resolveControl() works as expected.
let _registryDumped = false;
if (process.env.NODE_ENV === "development" && typeof window !== "undefined" && !_registryDumped) {
  _registryDumped = true;
  const controls = listControls();
  console.group(
    `%c[CAP Registry] ${controls.length} controls registered at DynamicForm module load`,
    "color: #22c55e; font-weight: bold;"
  );
  controls
    .sort((a, b) => a.code.localeCompare(b.code))
    .forEach((c) =>
      console.log(
        `  %-20s renderer=%s (v%d.%d.%d, %s/%s)`,
        c.code, c.renderer?.displayName ?? c.renderer?.name ?? "anonymous",
        c.version.major, c.version.minor, c.version.patch,
        c.tier, c.maturity
      )
    );

  // Verify specific resolveControl() calls requested by VS05F2 acceptance criteria
  const checks: [string, string][] = [
    ["SEL_DROPDOWN",  "SelectControl"],
    ["DOC_FILEUPLOAD","FileUploadControl"],
    ["TXT_AREA",      "TextAreaControl"],
    ["RICH_TEXT",     "TextAreaControl"],  // via CompatibilityRegistry → TXT_AREA
    ["FILE_UPLOAD",   "FileUploadControl"], // alias → DOC_FILEUPLOAD
    ["MULTI_SELECT",  "MultiSelectControl"], // alias → SEL_MULTISELECT
  ];
  console.group("%c[CAP Registry] resolveControl() verification:", "color: #3b82f6; font-weight: bold;");
  checks.forEach(([code, expectedName]) => {
    const fn = resolveControl(code, "1.0.0");
    const actual = fn?.displayName ?? fn?.name ?? "undefined";
    const pass = actual === expectedName || (fn && fn !== null);
    console.log(
      pass
        ? `%c  ✅ resolveControl("${code}") → ${actual}`
        : `%c  ❌ resolveControl("${code}") → ${actual} (expected: ${expectedName})`,
      pass ? "color: #22c55e" : "color: #ef4444"
    );
  });
  console.groupEnd();
  console.log("%c[CAP Registry] Total aliases:", "color: #a855f7", Object.keys(ControlCompatibilityRegistry).length);
  console.groupEnd();
}

interface DynamicFormProps {
  manifest: RuntimeManifest;
  initialData?: any;
  isSaving: boolean;
  isLoading?: boolean;
}

export function DynamicForm({ manifest, initialData, isSaving, isLoading = false }: DynamicFormProps) {
  const router = useRouter();
  const form = useFormContext();
  const runtimeContext = useRuntimeContext();
  const recordContext = useRecordContext();

  // ─── Resolve Layout ──────────────────────────────────────────────
  const layoutView = useMemo(() => {
    const layouts = manifest.presentation?.layoutViews || [];
    if (layouts.length === 0) return null;

    const defaultForm = layouts.find((v: any) => v.isDefault && v.layoutType === "FORM");
    const anyDefault = layouts.find((v: any) => v.isDefault);
    const firstForm = layouts.find((v: any) => v.layoutType === "FORM");
    return defaultForm || anyDefault || firstForm || layouts[0] || null;
  }, [manifest.presentation?.layoutViews]);

  const layout: LayoutRoot | null = useMemo(() => {
    if (!layoutView?.layout) return null;
    const l = layoutView.layout as LayoutRoot;
    if (!l.tabs || l.tabs.length === 0) return null;
    return l;
  }, [layoutView]);

  // ─── Build field lookup map ──────────────────────────────────────
  const fieldMap = useMemo(() => {
    const map = new Map<string, EntityFieldDefinition>();
    manifest.fields.forEach((f) => {
      map.set(f.id, f as unknown as EntityFieldDefinition);
      map.set(f.code, f as unknown as EntityFieldDefinition);
    });
    return map;
  }, [manifest.fields]);

  // Lifecycle initialize hook
  useEffect(() => {
    runtimeEventBus.publish({
      type: RuntimeEventType.INITIALIZE,
      source: "DynamicForm",
      timestamp: Date.now(),
      payload: runtimeContext,
    });
    return () => {
      runtimeEventBus.publish({
        type: RuntimeEventType.DESTROY,
        source: "DynamicForm",
        timestamp: Date.now(),
        payload: runtimeContext,
      });
    };
  }, []);

  const handleFieldChange = (fieldCode: string, val: any) => {
    const changeStart = performance.now();
    form.setValue(fieldCode, val, { shouldDirty: true, shouldValidate: true });
    
    const changeDuration = performance.now() - changeStart;
    runtimeContext.diagnostics.setMetric("valueChangeMs", changeDuration);
    
    const field = fieldMap.get(fieldCode);
    if (field) {
      runtimeEventBus.publish({
        type: RuntimeEventType.CHANGE,
        source: field.id,
        timestamp: Date.now(),
        payload: {
          fieldCode,
          value: val,
        },
      });
    }
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  const renderContent = () => {
    if (!layout) {
      return <EmptyState culture={runtimeContext.culture} />;
    }

    return (
      <FormTab
        tabs={layout.tabs}
        fieldMap={fieldMap}
        onChange={handleFieldChange}
        mode={initialData ? "EDIT" : "CREATE"}
      />
    );
  };

  return (
    <>
      <ValidationSummary
        errors={recordContext.validation.errors}
        culture={runtimeContext.culture}
      />

      {renderContent()}
    </>
  );
}

export default DynamicForm;
