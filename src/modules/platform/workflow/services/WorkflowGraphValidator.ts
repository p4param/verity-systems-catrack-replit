import type { IWorkflowGraphValidator } from "../contracts/IWorkflowGraphValidator";
import type {
  WorkflowRuntimeGraph,
  WorkflowValidationIssue,
} from "../models/WorkflowModels";

export class WorkflowGraphValidator implements IWorkflowGraphValidator {
  validate(graph: WorkflowRuntimeGraph): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    this.validateInitialStates(graph, issues);
    this.validateTerminalStates(graph, issues);
    this.validateDuplicateStateCodes(graph, issues);
    this.validateDuplicateTransitions(graph, issues);
    this.validateDuplicateTransitionCodes(graph, issues);
    this.validateInvalidPriorities(graph, issues);
    this.validateDeadEndsAndOrphans(graph, issues);
    this.validateReachability(graph, issues);
    this.validateCircularPaths(graph, issues);
    this.validateInvalidTerminalStates(graph, issues);
    this.validateRollbackPaths(graph, issues);
    this.validateRetryMetadata(graph, issues);

    return issues;
  }

  private validateTerminalStates(graph: WorkflowRuntimeGraph, issues: WorkflowValidationIssue[]): void {
    const terminal = graph.workflowGraph.nodes.filter((node) => node.isTerminal);
    if (terminal.length === 0) {
      issues.push({
        code: "WF_MISSING_TERMINAL_STATE",
        message: "Workflow graph has no terminal state.",
        severity: "Error",
      });
    }
  }

  private validateDuplicateStateCodes(graph: WorkflowRuntimeGraph, issues: WorkflowValidationIssue[]): void {
    const seen = new Set<string>();
    for (const node of graph.workflowGraph.nodes) {
      const key = node.code.toUpperCase();
      if (seen.has(key)) {
        issues.push({
          code: "WF_DUPLICATE_STATE_CODE",
          message: `Duplicate state code detected: ${node.code}`,
          severity: "Error",
          path: `states.${node.code}`,
        });
      }
      seen.add(key);
    }
  }

  private validateInitialStates(graph: WorkflowRuntimeGraph, issues: WorkflowValidationIssue[]): void {
    const initial = graph.workflowGraph.nodes.filter((node) => node.isInitial);
    if (initial.length === 0) {
      issues.push({
        code: "WF_MISSING_INITIAL_STATE",
        message: "Workflow graph has no initial state.",
        severity: "Error",
      });
    }

    if (initial.length > 1) {
      issues.push({
        code: "WF_MULTIPLE_INITIAL_STATES",
        message: "Workflow graph has multiple initial states.",
        severity: "Error",
      });
    }
  }

  private validateDuplicateTransitions(graph: WorkflowRuntimeGraph, issues: WorkflowValidationIssue[]): void {
    const seen = new Set<string>();
    for (const edge of graph.workflowGraph.edges) {
      const key = `${edge.from}|${edge.to}|${edge.actionCode}`.toUpperCase();
      if (seen.has(key)) {
        issues.push({
          code: "WF_DUPLICATE_TRANSITION",
          message: `Duplicate transition detected for ${edge.from} -> ${edge.to} (${edge.actionCode}).`,
          severity: "Error",
          path: `transitions.${edge.code}`,
        });
      }
      seen.add(key);
    }
  }

  private validateDuplicateTransitionCodes(graph: WorkflowRuntimeGraph, issues: WorkflowValidationIssue[]): void {
    const seen = new Set<string>();
    for (const edge of graph.workflowGraph.edges) {
      const key = edge.code.toUpperCase();
      if (seen.has(key)) {
        issues.push({
          code: "WF_DUPLICATE_TRANSITION_CODE",
          message: `Duplicate transition code detected: ${edge.code}.`,
          severity: "Error",
          path: `transitions.${edge.code}`,
        });
      }
      seen.add(key);
    }
  }

  private validateInvalidPriorities(graph: WorkflowRuntimeGraph, issues: WorkflowValidationIssue[]): void {
    for (const edge of graph.workflowGraph.edges) {
      if (!Number.isInteger(edge.priority) || edge.priority <= 0) {
        issues.push({
          code: "WF_INVALID_PRIORITY",
          message: `Transition ${edge.code} must have a positive integer priority.`,
          severity: "Error",
          path: `transitions.${edge.code}`,
        });
      }
    }
  }

  private validateDeadEndsAndOrphans(graph: WorkflowRuntimeGraph, issues: WorkflowValidationIssue[]): void {
    const stateCodes = new Set(graph.workflowGraph.nodes.map((node) => node.code));

    for (const node of graph.workflowGraph.nodes) {
      const incoming = graph.stateGraph.incomingByState[node.code] ?? [];
      const outgoing = graph.stateGraph.outgoingByState[node.code] ?? [];

      if (!node.isInitial && incoming.length === 0) {
        issues.push({
          code: "WF_ORPHAN_STATE",
          message: `State ${node.code} has no incoming transitions.`,
          severity: "Error",
          path: `states.${node.code}`,
        });
      }

      if (!node.isTerminal && outgoing.length === 0) {
        issues.push({
          code: "WF_DEAD_END_STATE",
          message: `State ${node.code} has no outgoing transitions but is not terminal.`,
          severity: "Error",
          path: `states.${node.code}`,
        });
      }
    }

    for (const edge of graph.workflowGraph.edges) {
      if (!stateCodes.has(edge.from) || !stateCodes.has(edge.to)) {
        issues.push({
          code: "WF_INVALID_TRANSITION_STATE",
          message: `Transition ${edge.code} references unknown state(s).`,
          severity: "Error",
          path: `transitions.${edge.code}`,
        });
      }

      if (edge.from === edge.to) {
        issues.push({
          code: "WF_SELF_TRANSITION",
          message: `Transition ${edge.code} is a self-transition on state ${edge.from}.`,
          severity: "Warning",
          path: `transitions.${edge.code}`,
        });
      }
    }
  }

  private validateReachability(graph: WorkflowRuntimeGraph, issues: WorkflowValidationIssue[]): void {
    const initial = graph.workflowGraph.nodes.find((node) => node.isInitial);
    if (!initial) {
      return;
    }

    const reachable = new Set<string>();
    const queue: string[] = [initial.code];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) {
        continue;
      }

      reachable.add(current);
      for (const next of graph.stateGraph.outgoingByState[current] ?? []) {
        if (!reachable.has(next)) {
          queue.push(next);
        }
      }
    }

    let disconnected = false;
    for (const node of graph.workflowGraph.nodes) {
      if (!reachable.has(node.code)) {
        issues.push({
          code: "WF_UNREACHABLE_STATE",
          message: `State ${node.code} is unreachable from the initial state.`,
          severity: "Error",
          path: `states.${node.code}`,
        });
        disconnected = true;
      }

      if (node.isTerminal && !reachable.has(node.code)) {
        issues.push({
          code: "WF_UNREACHABLE_TERMINAL_STATE",
          message: `Terminal state ${node.code} is unreachable from the initial state.`,
          severity: "Error",
          path: `states.${node.code}`,
        });
      }
    }

    if (disconnected) {
      issues.push({
        code: "WF_DISCONNECTED_GRAPH",
        message: "Workflow graph contains disconnected states.",
        severity: "Error",
      });
    }
  }

  private validateCircularPaths(graph: WorkflowRuntimeGraph, issues: WorkflowValidationIssue[]): void {
    const adjacency = graph.stateGraph.outgoingByState;
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (state: string): boolean => {
      if (visiting.has(state)) {
        return true;
      }
      if (visited.has(state)) {
        return false;
      }

      visiting.add(state);
      for (const next of adjacency[state] ?? []) {
        if (dfs(next)) {
          return true;
        }
      }
      visiting.delete(state);
      visited.add(state);
      return false;
    };

    for (const node of graph.workflowGraph.nodes) {
      if (dfs(node.code)) {
        issues.push({
          code: "WF_CIRCULAR_PATH",
          message: "Workflow graph contains circular paths.",
          severity: "Warning",
        });
        return;
      }
    }
  }

  private validateInvalidTerminalStates(graph: WorkflowRuntimeGraph, issues: WorkflowValidationIssue[]): void {
    for (const node of graph.workflowGraph.nodes) {
      const outgoing = graph.stateGraph.outgoingByState[node.code] ?? [];
      if (node.isTerminal && outgoing.length > 0) {
        issues.push({
          code: "WF_INVALID_TERMINAL_STATE",
          message: `Terminal state ${node.code} cannot have outgoing transitions.`,
          severity: "Error",
          path: `states.${node.code}`,
        });
      }
    }
  }

  private validateRollbackPaths(graph: WorkflowRuntimeGraph, issues: WorkflowValidationIssue[]): void {
    for (const edge of graph.workflowGraph.edges) {
      if (edge.rollbackFlag && !edge.compensationActionCode) {
        issues.push({
          code: "WF_INVALID_ROLLBACK_PATH",
          message: `Rollback transition ${edge.code} requires compensation action metadata.`,
          severity: "Error",
          path: `transitions.${edge.code}`,
        });
      }
    }
  }

  private validateRetryMetadata(graph: WorkflowRuntimeGraph, issues: WorkflowValidationIssue[]): void {
    for (const edge of graph.workflowGraph.edges) {
      if (!edge.retryPolicy) {
        continue;
      }

      if (!Number.isInteger(edge.retryPolicy.maxAttempts) || edge.retryPolicy.maxAttempts < 1) {
        issues.push({
          code: "WF_INVALID_RETRY_METADATA",
          message: `Transition ${edge.code} has invalid retry maxAttempts metadata.`,
          severity: "Error",
          path: `transitions.${edge.code}`,
        });
      }

      if (!Number.isFinite(edge.retryPolicy.backoffSeconds) || edge.retryPolicy.backoffSeconds < 0) {
        issues.push({
          code: "WF_INVALID_RETRY_METADATA",
          message: `Transition ${edge.code} has invalid retry backoffSeconds metadata.`,
          severity: "Error",
          path: `transitions.${edge.code}`,
        });
      }
    }
  }
}
