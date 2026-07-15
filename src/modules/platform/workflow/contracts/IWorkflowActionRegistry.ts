import type { WorkflowAction } from "../models/WorkflowModels";
import type { IWorkflowActionProvider } from "./IWorkflowActionProvider";

export interface IWorkflowActionRegistry {
  register(provider: IWorkflowActionProvider): void;
  getByActionType(actionType: WorkflowAction["actionType"]): IWorkflowActionProvider | null;
  getByProviderKey(providerKey: string): IWorkflowActionProvider | null;
  getAll(): readonly IWorkflowActionProvider[];
}
