import type { IWorkflowValidator } from "../contracts/IWorkflowValidator";
import type {
  WorkflowMetadataSnapshot,
  WorkflowValidationIssue,
  WorkflowValidationResult,
} from "../models/WorkflowModels";
import type { IRuntimeExpressionAdapter } from "./RuntimeExpressionAdapter";

export class WorkflowValidator implements IWorkflowValidator {
  constructor(private readonly expressionAdapter: IRuntimeExpressionAdapter) {}

  async validate(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowValidationResult> {
    const issues: WorkflowValidationIssue[] = [];

    this.validateStateCodes(snapshot, issues);
    this.validateInitialState(snapshot, issues);
    this.validateTerminalState(snapshot, issues);
    this.validateTransitionCodes(snapshot, issues);
    this.validateVariables(snapshot, issues);
    this.validateOrphanTransitions(snapshot, issues);
    this.validateCircularTransitions(snapshot, issues);
    this.validateActions(snapshot, issues);
    this.validateExpressions(snapshot, issues);
    this.validatePublishStatus(snapshot, issues);

    const errors = issues.filter((item) => item.severity === "Error");
    const warnings = issues.filter((item) => item.severity === "Warning");

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAt: snapshot.version.updatedAt ?? snapshot.version.createdAt,
    };
  }

  private validateStateCodes(snapshot: WorkflowMetadataSnapshot, issues: WorkflowValidationIssue[]): void {
    const seen = new Set<string>();
    for (const state of snapshot.states) {
      const key = state.code.toUpperCase();
      if (seen.has(key)) {
        issues.push({
          code: "WF_DUPLICATE_STATE_CODE",
          message: `Duplicate state code detected: ${state.code}`,
          severity: "Error",
          path: `states.${state.code}`,
        });
      }
      seen.add(key);
    }
  }

  private validateInitialState(snapshot: WorkflowMetadataSnapshot, issues: WorkflowValidationIssue[]): void {
    const initialStates = snapshot.states.filter((state) => state.isInitial);
    if (initialStates.length === 0) {
      issues.push({
        code: "WF_MISSING_INITIAL_STATE",
        message: "Workflow must contain exactly one initial state.",
        severity: "Error",
      });
    }

    if (initialStates.length > 1) {
      issues.push({
        code: "WF_MULTIPLE_INITIAL_STATES",
        message: "Workflow contains multiple initial states.",
        severity: "Error",
      });
    }
  }

  private validateTerminalState(snapshot: WorkflowMetadataSnapshot, issues: WorkflowValidationIssue[]): void {
    if (!snapshot.states.some((state) => state.isTerminal)) {
      issues.push({
        code: "WF_MISSING_TERMINAL_STATE",
        message: "Workflow must contain at least one terminal state.",
        severity: "Error",
      });
    }
  }

  private validateTransitionCodes(snapshot: WorkflowMetadataSnapshot, issues: WorkflowValidationIssue[]): void {
    const seen = new Set<string>();
    for (const transition of snapshot.transitions) {
      const key = transition.code.toUpperCase();
      if (seen.has(key)) {
        issues.push({
          code: "WF_DUPLICATE_TRANSITION_CODE",
          message: `Duplicate transition code detected: ${transition.code}`,
          severity: "Error",
          path: `transitions.${transition.code}`,
        });
      }
      seen.add(key);
    }
  }

  private validateVariables(snapshot: WorkflowMetadataSnapshot, issues: WorkflowValidationIssue[]): void {
    const seen = new Set<string>();
    for (const variable of snapshot.variables) {
      const key = variable.code.toUpperCase();
      if (seen.has(key)) {
        issues.push({
          code: "WF_DUPLICATE_VARIABLE",
          message: `Duplicate variable code detected: ${variable.code}`,
          severity: "Error",
          path: `variables.${variable.code}`,
        });
      }
      seen.add(key);
    }
  }

  private validateOrphanTransitions(snapshot: WorkflowMetadataSnapshot, issues: WorkflowValidationIssue[]): void {
    const states = new Set(snapshot.states.map((state) => state.code.toUpperCase()));

    for (const transition of snapshot.transitions) {
      if (!states.has(transition.sourceStateCode.toUpperCase())) {
        issues.push({
          code: "WF_ORPHAN_SOURCE_STATE",
          message: `Transition ${transition.code} references missing source state ${transition.sourceStateCode}.`,
          severity: "Error",
          path: `transitions.${transition.code}`,
        });
      }

      if (!states.has(transition.destinationStateCode.toUpperCase())) {
        issues.push({
          code: "WF_ORPHAN_DESTINATION_STATE",
          message: `Transition ${transition.code} references missing destination state ${transition.destinationStateCode}.`,
          severity: "Error",
          path: `transitions.${transition.code}`,
        });
      }
    }
  }

  private validateCircularTransitions(snapshot: WorkflowMetadataSnapshot, issues: WorkflowValidationIssue[]): void {
    const graph = new Map<string, string[]>();
    for (const state of snapshot.states) {
      graph.set(state.code, []);
    }

    for (const transition of snapshot.transitions) {
      const list = graph.get(transition.sourceStateCode) ?? [];
      list.push(transition.destinationStateCode);
      graph.set(transition.sourceStateCode, list);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (node: string): boolean => {
      if (visiting.has(node)) {
        return true;
      }
      if (visited.has(node)) {
        return false;
      }

      visiting.add(node);
      const neighbors = graph.get(node) ?? [];
      for (const next of neighbors) {
        if (dfs(next)) {
          return true;
        }
      }
      visiting.delete(node);
      visited.add(node);
      return false;
    };

    for (const state of snapshot.states) {
      if (dfs(state.code)) {
        issues.push({
          code: "WF_CIRCULAR_TRANSITIONS",
          message: "Circular transition graph detected.",
          severity: "Error",
        });
        break;
      }
    }
  }

  private validateActions(snapshot: WorkflowMetadataSnapshot, issues: WorkflowValidationIssue[]): void {
    const actionCodes = new Set(snapshot.actions.map((action) => action.code.toUpperCase()));
    for (const transition of snapshot.transitions) {
      if (!transition.actionCode || !actionCodes.has(transition.actionCode.toUpperCase())) {
        issues.push({
          code: "WF_MISSING_ACTION",
          message: `Transition ${transition.code} references missing action ${transition.actionCode}.`,
          severity: "Error",
          path: `transitions.${transition.code}`,
        });
      }
    }
  }

  private validateExpressions(snapshot: WorkflowMetadataSnapshot, issues: WorkflowValidationIssue[]): void {
    const expressionMap = new Map(snapshot.expressions.map((expression) => [expression.id, expression]));

    for (const condition of snapshot.conditions) {
      if (!expressionMap.has(condition.expressionId)) {
        issues.push({
          code: "WF_INVALID_EXPRESSION_REF",
          message: `Condition ${condition.code} references missing expression ${condition.expressionId}.`,
          severity: "Error",
          path: `conditions.${condition.code}`,
        });
      }
    }

    for (const expression of snapshot.expressions) {
      const result = this.expressionAdapter.validate(expression.expression);
      if (!result.valid) {
        issues.push({
          code: "WF_INVALID_EXPRESSION",
          message: `Expression ${expression.code} is invalid: ${result.error}`,
          severity: "Error",
          path: `expressions.${expression.code}`,
        });
      }
    }
  }

  private validatePublishStatus(snapshot: WorkflowMetadataSnapshot, issues: WorkflowValidationIssue[]): void {
    if (snapshot.version.status === "Published" && !snapshot.version.publishedAt) {
      issues.push({
        code: "WF_INVALID_PUBLISH_STATUS",
        message: "Published workflow version must include publishedAt timestamp.",
        severity: "Error",
        path: `version.${snapshot.version.id}`,
      });
    }
  }
}
