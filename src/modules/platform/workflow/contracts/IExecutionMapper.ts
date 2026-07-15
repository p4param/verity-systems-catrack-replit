import type { IExecutionContext } from "./IExecutionContext";
import type { RuntimeOperationRequest } from "./IRuntimeOperationRequest";
import type { ExecutionPlan } from "../models/WorkflowModels";

export interface IExecutionMapper {
  map(plan: ExecutionPlan, context: IExecutionContext): RuntimeOperationRequest[];
}