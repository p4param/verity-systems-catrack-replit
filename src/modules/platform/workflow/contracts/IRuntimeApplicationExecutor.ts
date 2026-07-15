import type { IWorkflowExecutor } from "./IWorkflowExecutor";
import type { RuntimeOperationRequest } from "./IRuntimeOperationRequest";
import type { RuntimeOperationResponse } from "./IRuntimeOperationResponse";

export interface IRuntimeApplicationExecutor extends IWorkflowExecutor {
  readonly runtimeApplicationExecutorKey: string;
}