import type { IWorkflowActionProvider } from "../contracts/IWorkflowActionProvider";
import type { IWorkflowActionRegistry } from "../contracts/IWorkflowActionRegistry";
import type { WorkflowAction } from "../models/WorkflowModels";

export class WorkflowActionRegistry implements IWorkflowActionRegistry {
  private readonly byType = new Map<WorkflowAction["actionType"], IWorkflowActionProvider>();
  private readonly byProviderKey = new Map<string, IWorkflowActionProvider>();

  register(provider: IWorkflowActionProvider): void {
    this.byProviderKey.set(provider.providerKey, provider);
    for (const actionType of provider.actionTypes) {
      this.byType.set(actionType, provider);
    }
  }

  getByActionType(actionType: WorkflowAction["actionType"]): IWorkflowActionProvider | null {
    return this.byType.get(actionType) ?? null;
  }

  getByProviderKey(providerKey: string): IWorkflowActionProvider | null {
    return this.byProviderKey.get(providerKey) ?? null;
  }

  getAll(): readonly IWorkflowActionProvider[] {
    return [...this.byProviderKey.values()];
  }
}
