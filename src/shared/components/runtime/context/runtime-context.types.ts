import React from "react";
import { RuntimePermissions, RuntimeDesignSystem, RuntimeCulture } from "../types/framework";
import { IStorageProvider } from "../services/StorageProvider";

export type RuntimeViewMode = "CREATE" | "EDIT" | "VIEW" | "PRINT" | "QUICK_CREATE" | "DIALOG" | "WIZARD";
export type RuntimePageState = "LOADING" | "READY" | "SAVING" | "SAVED" | "ERROR" | "READONLY";
export type DisplayDensity = "COMPACT" | "COMFORTABLE" | "RELAXED";

export interface RuntimeAction {
  readonly id: string;
  readonly label: string;
  readonly icon?: React.ReactNode;
  readonly position: "left" | "center" | "right";
  readonly priority: "primary" | "secondary";
  readonly visible: boolean;
  readonly enabled: boolean;
  readonly onExecute: () => void;
}

export interface RuntimeCapabilities {
  readonly canSave: boolean;
  readonly canDelete: boolean;
  readonly canRefresh: boolean;
  readonly canPrint: boolean;
  readonly canExport: boolean;
  readonly canCopy: boolean;
  readonly canDuplicate: boolean;
  readonly canAttachFiles: boolean;
  readonly canViewAudit: boolean;
}

/**
 * Grouped platform services injected into RuntimeContext.
 * Prevents flat property sprawl as the platform grows.
 * Controls access services via runtimeContext.services.storage, etc.
 */
export interface RuntimeServices {
  /** File/document storage. Defaults to LocalStorageProvider. */
  readonly storage: IStorageProvider;
  /** Lookup/reference data resolver (server-side search). */
  readonly lookup: {
    search: (entityCode: string, query: string) => Promise<Array<{ id: string; label: string }>>;
  };
  /** Expression evaluator (for computed fields, visibility rules). */
  readonly expression: {
    evaluate: (expression: string, context: Record<string, unknown>) => unknown;
  };
  /** Field-level validation runner. */
  readonly validation: {
    validate: (fieldCode: string, value: unknown, rules: Record<string, unknown>) => string | undefined;
  };
  /** In-form notification bus (toast/banner messages from controls). */
  readonly notification: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}

export interface RuntimeContext {
  readonly entity: {
    readonly id: string;
    readonly code: string;
    readonly name: string;
  };
  readonly permissions: Readonly<RuntimePermissions>;
  readonly designSystem: Readonly<RuntimeDesignSystem>;
  readonly culture: Readonly<RuntimeCulture>;
  readonly timezone: string;
  readonly workflow: {
    readonly state: string;
  };
  readonly diagnostics: {
    readonly metrics: {
      readonly initialRenderMs: number;
      readonly tabSwitchMs: number;
      readonly validationMs: number;
      readonly valueChangeMs: number;
    };
    readonly setMetric: (
      name: "initialRenderMs" | "tabSwitchMs" | "validationMs" | "valueChangeMs",
      value: number
    ) => void;
  };
  readonly viewMode: RuntimeViewMode;
  readonly pageState: RuntimePageState;
  readonly density: DisplayDensity;
  readonly capabilities: Readonly<RuntimeCapabilities>;
  readonly pageMetadata: {
    readonly title: string;
    readonly subtitle?: string;
    readonly icon?: string;
    readonly description?: string;
  };
  readonly actions: ReadonlyArray<RuntimeAction>;
  /** Grouped platform services. Access via runtimeContext.services.storage, etc. */
  readonly services: Readonly<RuntimeServices>;
}

export interface RecordContext {
  readonly currentValues: Readonly<Record<string, unknown>>;
  readonly originalValues: Readonly<Record<string, unknown>>;
  readonly dirtyFields: Readonly<Record<string, boolean>>;
  readonly modifiedSincePublish: boolean;
  readonly validation: {
    readonly errors: Readonly<Record<string, string>>;
    readonly isValid: boolean;
  };
}
