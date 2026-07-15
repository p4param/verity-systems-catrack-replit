import type { RuntimeContext } from "../models/RuntimeContext";
import type { RuntimeOperation } from "../models/RuntimeOperation";
import type { RuntimeOperationResult, RuntimeExecutionDiagnostics } from "../models/RuntimeOperationResult";
import type { RuntimeRecord } from "@/modules/platform/persistence";
import type { RuntimeOperationPlan } from "../services/OperationDispatcher";
import type { RuntimeTransaction } from "../models/RuntimeTransaction";

export const MiddlewareExecutionPolicy = {
  Continue: "Continue",
  StopOnFailure: "StopOnFailure",
  ContinueOnWarning: "ContinueOnWarning",
  AlwaysRun: "AlwaysRun",
} as const;

export type MiddlewareExecutionPolicy =
  (typeof MiddlewareExecutionPolicy)[keyof typeof MiddlewareExecutionPolicy];

export interface RuntimeMiddlewareRegistration {
  id: string;
  name: string;
  middleware: RuntimeMiddleware;
  order: number;
  priority: number;
  enabled: boolean;
  dependencies: string[];
  policy: MiddlewareExecutionPolicy;
}

export interface RuntimeMiddlewareState {
  context: RuntimeContext;
  input?: unknown;
  loadedRecord?: RuntimeRecord | null;
  plan?: RuntimeOperationPlan;
  persisted?: RuntimeRecord | RuntimeRecord[] | null;
  transaction: RuntimeTransaction;
  diagnostics: RuntimeExecutionDiagnostics;
  warnings: string[];
  nonFatalErrors: string[];
  flags: {
    persistenceSucceeded: boolean;
  };
  result?: RuntimeOperationResult<unknown>;
}

export type RuntimeMiddleware = (
  state: RuntimeMiddlewareState,
  next: () => Promise<void>
) => Promise<void>;

export type RuntimeOperationAction = (
  state: RuntimeMiddlewareState
) => Promise<RuntimeRecord | RuntimeRecord[] | null>;

export type RuntimeValidator = (state: RuntimeMiddlewareState) => Promise<void>;
export type RuntimeRule = (state: RuntimeMiddlewareState) => Promise<void>;
export type RuntimeWorkflow = (state: RuntimeMiddlewareState) => Promise<void>;

export type RuntimeActionRegistry = Map<RuntimeOperation, RuntimeOperationAction>;
