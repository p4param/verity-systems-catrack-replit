import type { ITransitionEngine } from "../contracts/ITransitionEngine";
import type { ITransitionResolver } from "../contracts/ITransitionResolver";
import type { IWorkflowGraphValidator } from "../contracts/IWorkflowGraphValidator";
import { TransitionResolver } from "./TransitionResolver";
import { WorkflowGraphValidator } from "./WorkflowGraphValidator";
import type {
  WorkflowEdge,
  WorkflowRuntimeGraph,
  WorkflowRuntimeModel,
  WorkflowTransitionResolutionContext,
  WorkflowTransitionResolutionResult,
  WorkflowValidationIssue,
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

export class TransitionEngine implements ITransitionEngine {
  constructor(
    private readonly transitionResolver: ITransitionResolver = new TransitionResolver(),
    private readonly graphValidator: IWorkflowGraphValidator = new WorkflowGraphValidator()
  ) {}

  registerTransitions(edges: WorkflowEdge[]): readonly WorkflowEdge[] {
    return deepFreeze([...edges].sort((a, b) => a.priority - b.priority));
  }

  validateTransitions(graph: WorkflowRuntimeGraph): WorkflowValidationIssue[] {
    return this.graphValidator
      .validate(graph)
      .filter((item) =>
        ["WF_DUPLICATE_TRANSITION", "WF_INVALID_PRIORITY", "WF_INVALID_ROLLBACK_PATH"].includes(item.code)
      );
  }

  async getAvailableTransitions(runtimeModel: WorkflowRuntimeModel, stateCode: string): Promise<WorkflowEdge[]> {
    const sourceKey = Object.keys(runtimeModel.runtimeGraph.transitionGraph.transitionsBySourceState).find(
      (item) => item.toUpperCase() === stateCode.toUpperCase()
    );

    if (!sourceKey) {
      return [];
    }

    return [...runtimeModel.runtimeGraph.transitionGraph.transitionsBySourceState[sourceKey]].sort(
      (a, b) => a.priority - b.priority
    );
  }

  async resolve(
    runtimeModel: WorkflowRuntimeModel,
    stateCode: string,
    context: WorkflowTransitionResolutionContext = {}
  ): Promise<WorkflowTransitionResolutionResult> {
    return this.transitionResolver.resolveTransitions(runtimeModel, stateCode, context);
  }
}
