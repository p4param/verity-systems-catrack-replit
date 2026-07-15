import type { IWorkflowActionEngine } from "../contracts/IWorkflowActionEngine";
import type { IWorkflowActionRegistry } from "../contracts/IWorkflowActionRegistry";
import type {
  ActionPlan,
  WorkflowAction,
  WorkflowActionResolutionContext,
} from "../models/WorkflowModels";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const child = (value as Record<string, unknown>)[key];
      if (child && typeof child === "object" && !Object.isFrozen(child)) {
        deepFreeze(child);
      }
    }
  }
  return value;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function resolveGeneratedAt(context: WorkflowActionResolutionContext): Date {
  return context.snapshot.version.publishedAt ?? context.snapshot.version.updatedAt ?? context.snapshot.version.createdAt;
}

export class WorkflowActionEngine implements IWorkflowActionEngine {
  constructor(private readonly registry: IWorkflowActionRegistry) {}

  async resolve(context: WorkflowActionResolutionContext): Promise<ActionPlan> {
    const enabledActions = context.snapshot.actions.filter((action) => action.isEnabled);
    const actionByCode = new Map(enabledActions.map((action) => [action.code, action]));
    const resolvedCodes = this.collectActionCodes(context.transition.actionCode, actionByCode);

    const selectedActions = resolvedCodes
      .map((code) => actionByCode.get(code))
      .filter((action): action is WorkflowAction => !!action)
      .sort((a, b) => a.sequence - b.sequence || a.code.localeCompare(b.code));

    const resolvedActions = [] as ActionPlan["actions"];
    for (const action of selectedActions) {
      const provider = action.providerKey
        ? this.registry.getByProviderKey(action.providerKey)
        : this.registry.getByActionType(action.actionType);
      if (!provider) {
        throw new Error(`No action provider registered for action ${action.code} (${action.actionType}).`);
      }

      const resolved = await provider.resolveAction(context, action);
      resolvedActions.push({
        ...resolved,
        dependencies: uniqueSorted(resolved.dependencies),
      });
    }

    return deepFreeze({
      workflowVersionId: context.snapshot.version.id,
      transitionCode: context.transition.code,
      generatedAt: resolveGeneratedAt(context),
      actions: resolvedActions,
      diagnostics: {
        rootActionCode: context.transition.actionCode,
        providerCount: this.registry.getAll().length,
      },
    });
  }

  private collectActionCodes(
    rootActionCode: string,
    actionByCode: Map<string, WorkflowAction>
  ): string[] {
    const visited = new Set<string>();

    const walk = (actionCode: string): void => {
      if (visited.has(actionCode)) {
        return;
      }
      visited.add(actionCode);

      const action = actionByCode.get(actionCode);
      if (!action) {
        return;
      }

      for (const dependencyCode of action.dependsOnActionCodes ?? []) {
        walk(dependencyCode);
      }
    };

    walk(rootActionCode);
    return [...visited];
  }
}
