import type { RuntimeOperation } from "./RuntimeOperation";

export interface RuntimeExecutionDiagnostics {
  pipelineTime: number;
  metadataTime: number;
  authorizationTime: number;
  validationTime: number;
  businessRulesTime: number;
  workflowTime: number;
  persistenceTime: number;
  notificationTime: number;
  auditTime: number;
  totalTime: number;
  middleware: Record<string, number>;
}

export interface RuntimeOperationResult<TRecord = unknown> {
  success: boolean;
  messages: string[];
  warnings: string[];
  errors: string[];
  validationErrors: string[];
  businessRuleErrors: string[];
  workflowErrors: string[];
  recordId: string | null;
  affectedRows: number;
  correlationId: string;
  executionTime: number;
  operation: RuntimeOperation;
  metadata: Record<string, unknown>;
  diagnostics: RuntimeExecutionDiagnostics;
  record?: TRecord;
}
