import type {
  ResolvedWorkflowAction,
  WorkflowAction,
  WorkflowActionResolutionContext,
} from "../models/WorkflowModels";

export interface WorkflowActionProviderCapabilities {
  deterministic: boolean;
  supportsParallelMetadata: boolean;
  supportsCompensationMetadata: boolean;
  supportsRetryMetadata: boolean;
  supportsTimeoutMetadata: boolean;
}

export interface IWorkflowActionProvider {
  readonly providerKey: string;
  readonly actionTypes: readonly WorkflowAction["actionType"][];
  readonly capabilities: WorkflowActionProviderCapabilities;

  resolveAction(
    context: WorkflowActionResolutionContext,
    action: WorkflowAction
  ): Promise<ResolvedWorkflowAction>;
}

export interface IPlatformActionProvider extends IWorkflowActionProvider {}
export interface IApiActionProvider extends IWorkflowActionProvider {}
export interface IDocumentActionProvider extends IWorkflowActionProvider {}
export interface IReportActionProvider extends IWorkflowActionProvider {}
export interface IEventActionProvider extends IWorkflowActionProvider {}
export interface INotificationActionProvider extends IWorkflowActionProvider {}
export interface ICustomActionProvider extends IWorkflowActionProvider {}
