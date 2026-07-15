import type { IStateResolver } from "../contracts/IStateResolver";
import type {
  WorkflowNode,
  WorkflowRuntimeModel,
  WorkflowValidationIssue,
} from "../models/WorkflowModels";

export class StateResolver implements IStateResolver {
  resolveInitialState(runtimeModel: WorkflowRuntimeModel): WorkflowNode | null {
    const states = runtimeModel.runtimeGraph.stateGraph.states;
    const initial = states.filter((item) => item.isInitial);
    if (initial.length !== 1) {
      return null;
    }

    return initial[0];
  }

  resolveState(runtimeModel: WorkflowRuntimeModel, stateCode: string): WorkflowNode | null {
    return (
      runtimeModel.runtimeGraph.stateGraph.states.find(
        (state) => state.code.toUpperCase() === stateCode.toUpperCase()
      ) ?? null
    );
  }

  isTerminalState(runtimeModel: WorkflowRuntimeModel, stateCode: string): boolean {
    const state = this.resolveState(runtimeModel, stateCode);
    if (!state) {
      return false;
    }
    return state.isTerminal;
  }

  validateStates(runtimeModel: WorkflowRuntimeModel): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];
    const seen = new Set<string>();

    for (const state of runtimeModel.runtimeGraph.stateGraph.states) {
      const key = state.code.toUpperCase();
      if (seen.has(key)) {
        issues.push({
          code: "WF_DUPLICATE_STATE_CODE",
          message: `Duplicate state code: ${state.code}`,
          severity: "Error",
          path: `states.${state.code}`,
        });
      }
      seen.add(key);
    }

    const initial = runtimeModel.runtimeGraph.stateGraph.states.filter((item) => item.isInitial);
    if (initial.length !== 1) {
      issues.push({
        code: "WF_INVALID_INITIAL_STATE_COUNT",
        message: "Exactly one initial state is required.",
        severity: "Error",
      });
    }

    return issues;
  }
}
