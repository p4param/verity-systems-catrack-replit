"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { defaultStorageProvider } from "../services/StorageProvider";
import { 
  RuntimeContext, 
  RecordContext, 
  RuntimeViewMode, 
  RuntimePageState, 
  DisplayDensity, 
  RuntimeCapabilities, 
  RuntimeAction 
} from "../context/runtime-context.types";
import { RuntimeContextProvider } from "../context/runtime-context";
import { RecordContextProvider } from "../context/record-context";
import { RuntimeDesignSystem } from "../design-system/RuntimeDesignSystem";
import { diagnosticsService } from "../services/DiagnosticsService";
import { RuntimeDiagnostics } from "./RuntimeDiagnostics";
import { logger } from "@/lib/logger";

interface RuntimeHostProps {
  manifest: RuntimeManifest;
  initialData?: any;
  onSubmit: (data: any) => void;
  isSaving: boolean;
  viewMode?: RuntimeViewMode;
  pageState?: RuntimePageState;
  density?: DisplayDensity;
  capabilities?: RuntimeCapabilities;
  pageMetadata?: {
    title: string;
    subtitle?: string;
    icon?: string;
    description?: string;
  };
  actions?: RuntimeAction[];
  children: React.ReactNode;
}

const defaultCapabilities: RuntimeCapabilities = {
  canSave: true,
  canDelete: false,
  canRefresh: false,
  canPrint: false,
  canExport: false,
  canCopy: false,
  canDuplicate: false,
  canAttachFiles: false,
  canViewAudit: false,
};

export const RuntimeHost: React.FC<RuntimeHostProps> = ({
  manifest,
  initialData,
  onSubmit,
  isSaving,
  viewMode = "CREATE",
  pageState = "READY",
  density = "COMFORTABLE",
  capabilities = defaultCapabilities,
  pageMetadata,
  actions = [],
  children,
}) => {
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  // Performance Benchmarks Metrics
  const renderStartTime = useRef(performance.now());
  const [metrics, setMetrics] = useState({
    initialRenderMs: 0,
    tabSwitchMs: 0,
    validationMs: 0,
    valueChangeMs: 0,
  });

  const setMetric = (
    name: "initialRenderMs" | "tabSwitchMs" | "validationMs" | "valueChangeMs",
    value: number
  ) => {
    setMetrics((prev) => ({ ...prev, [name]: value }));
  };

  // Track initial load performance
  useEffect(() => {
    const end = performance.now();
    const duration = end - renderStartTime.current;
    setMetric("initialRenderMs", duration);
    logger.info(`Initial form render completed in ${duration.toFixed(2)}ms`);
  }, []);

  // Subscribe to Developer Diagnostics service
  useEffect(() => {
    const unsub = diagnosticsService.subscribe((enabled) => {
      setDiagnosticsOpen(enabled);
    });
    setDiagnosticsOpen(diagnosticsService.isEnabled());
    return unsub;
  }, []);

  // ─── Resolve Layout ──────────────────────────────────────────────
  const layoutView = useMemo(() => {
    const layouts = manifest.presentation?.layoutViews || [];
    if (layouts.length === 0) return null;

    const defaultForm = layouts.find((v: any) => v.isDefault && v.layoutType === "FORM");
    const anyDefault = layouts.find((v: any) => v.isDefault);
    const firstForm = layouts.find((v: any) => v.layoutType === "FORM");
    return defaultForm || anyDefault || firstForm || layouts[0] || null;
  }, [manifest.presentation?.layoutViews]);

  const layout = useMemo(() => {
    if (!layoutView?.layout) return null;
    return layoutView.layout as any;
  }, [layoutView]);

  // ─── Default Values ──────────────────────────────────────────────
  const defaultValues = useMemo(() => {
    const defaults: Record<string, any> = {};
    manifest.fields.forEach((f) => {
      if (f.defaultValue !== undefined && f.defaultValue !== null) {
        if (f.dataType === "NUMBER" || f.dataType === "DECIMAL") {
          defaults[f.code] = Number(f.defaultValue);
        } else if (f.dataType === "BOOLEAN") {
          defaults[f.code] = f.defaultValue === "true";
        } else if (f.uiControl === "MULTI_SELECT" || f.uiControl === "MULTI_LOOKUP") {
          try {
            defaults[f.code] = typeof f.defaultValue === "string" ? JSON.parse(f.defaultValue) : f.defaultValue;
          } catch (e) {
            defaults[f.code] = [];
          }
        } else {
          defaults[f.code] = f.defaultValue;
        }
      } else if (f.uiControl === "MULTI_SELECT" || f.uiControl === "MULTI_LOOKUP") {
        defaults[f.code] = [];
      } else {
        defaults[f.code] = "";
      }
    });

    if (initialData) {
      Object.assign(defaults, initialData);
    }
    return defaults;
  }, [manifest.fields, initialData]);

  const form = useForm({ defaultValues });
  const { errors, isDirty } = form.formState;

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  // ─── Immutable Runtime Context Build ─────────────────────────────
  const runtimeContext: RuntimeContext = useMemo(() => {
    return {
      entity: {
        id: manifest.entityId || "",
        code: manifest.entity || "",
        name: manifest.entityName || manifest.entity || "",
      },
      permissions: Object.freeze({
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      }),
      designSystem: RuntimeDesignSystem,
      culture: Object.freeze({
        locale: "en-US",
        currencyCode: "USD",
        currencySymbol: "$",
        decimalSeparator: ".",
        thousandSeparator: ",",
        shortDateFormat: "MM/DD/YYYY",
        longDateFormat: "MMMM DD, YYYY",
        firstDayOfWeek: 0,
        rtl: false,
      }),
      timezone: "UTC",
      workflow: {
        state: (form.watch() as any)?.status || "DRAFT",
      },
      diagnostics: {
        metrics,
        setMetric,
      },
      viewMode,
      pageState,
      density,
      capabilities: Object.freeze(capabilities),
      pageMetadata: Object.freeze({
        title: pageMetadata?.title || manifest.entityName || manifest.entity || "",
        subtitle: pageMetadata?.subtitle,
        icon: pageMetadata?.icon,
        description: pageMetadata?.description,
      }),
      actions: Object.freeze(actions),
      services: Object.freeze({
        storage: defaultStorageProvider,
        lookup: {
          search: async (entityCode: string, query: string) => {
            const res = await fetch(`/api/runtime/lookup?entity=${entityCode}&q=${encodeURIComponent(query)}`);
            if (!res.ok) return [];
            return res.json() as Promise<Array<{ id: string; label: string }>>;
          },
        },
        expression: {
          evaluate: (expression: string, context: Record<string, unknown>) => {
            // Stub — full evaluator wired in VS07 (Runtime Execution Engine)
            return undefined;
          },
        },
        validation: {
          validate: (fieldCode: string, value: unknown, rules: Record<string, unknown>) => {
            // Stub — full validator wired in VS07
            return undefined;
          },
        },
        notification: {
          info: (message: string) => console.info(`[CAP Runtime] ${message}`),
          warn: (message: string) => console.warn(`[CAP Runtime] ${message}`),
          error: (message: string) => console.error(`[CAP Runtime] ${message}`),
        },
      }),
    };
  }, [manifest, layoutView, layout, form.watch(), metrics, viewMode, pageState, density, capabilities, pageMetadata, actions]);

  // ─── Record Context Build (Form State) ───────────────────────────
  const recordContext: RecordContext = useMemo(() => {
    const currentVals = form.watch() || {};
    const validationErrors = Object.keys(errors).reduce((acc, key) => {
      acc[key] = String(errors[key]?.message || "Invalid field value");
      return acc;
    }, {} as Record<string, string>);

    return {
      currentValues: Object.freeze({ ...currentVals }),
      originalValues: Object.freeze({ ...defaultValues }),
      dirtyFields: Object.freeze({ ...form.formState.dirtyFields }),
      modifiedSincePublish: isDirty,
      validation: {
        errors: Object.freeze(validationErrors),
        isValid: Object.keys(errors).length === 0,
      },
    };
  }, [form.watch(), errors, defaultValues, isDirty, form.formState.dirtyFields]);

  return (
    <RuntimeContextProvider value={runtimeContext}>
      <RecordContextProvider value={recordContext}>
        <Form {...form}>
          <form 
            id="runtime-entity-form" 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="space-y-6 w-full relative"
          >
            {children}
          </form>
        </Form>

        <RuntimeDiagnostics
          context={runtimeContext}
          manifest={manifest}
          layout={layout}
          open={diagnosticsOpen}
          onOpenChange={(val) => {
            setDiagnosticsOpen(val);
            diagnosticsService.setEnabled(val);
          }}
          performanceMetrics={metrics}
        />
      </RecordContextProvider>
    </RuntimeContextProvider>
  );
};

export default RuntimeHost;
