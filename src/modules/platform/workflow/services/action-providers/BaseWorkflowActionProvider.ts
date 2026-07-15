import type {
  IWorkflowActionProvider,
  WorkflowActionProviderCapabilities,
} from "../../contracts/IWorkflowActionProvider";
import type {
  ResolvedWorkflowAction,
  WorkflowAction,
  WorkflowActionResolutionContext,
} from "../../models/WorkflowModels";

function uniqueSorted(values: readonly string[] | undefined): string[] {
  return [...new Set(values ?? [])].sort((a, b) => a.localeCompare(b));
}

export abstract class BaseWorkflowActionProvider implements IWorkflowActionProvider {
  public readonly capabilities: WorkflowActionProviderCapabilities = {
    deterministic: true,
    supportsParallelMetadata: true,
    supportsCompensationMetadata: true,
    supportsRetryMetadata: true,
    supportsTimeoutMetadata: true,
  };

  constructor(
    public readonly providerKey: string,
    public readonly actionTypes: readonly WorkflowAction["actionType"][]
  ) {}

  async resolveAction(
    context: WorkflowActionResolutionContext,
    action: WorkflowAction
  ): Promise<ResolvedWorkflowAction> {
    const payload = (action.payload ?? {}) as Record<string, unknown>;

    return {
      actionId: action.id,
      actionCode: action.code,
      actionType: action.actionType,
      providerKey: this.providerKey,
      sequence: action.sequence,
      priority: action.priority ?? action.sequence,
      dependencies: uniqueSorted(action.dependsOnActionCodes),
      parallelMode: action.parallelMode,
      payload,
      policyMetadata: {
        retryPolicy: action.retryPolicy,
        timeoutSeconds: action.timeoutSeconds,
        compensationActionCode: action.compensationActionCode,
        rollbackOnFailure: action.rollbackOnFailure,
      },
    };
  }
}
