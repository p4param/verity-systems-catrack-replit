import type { IWorkflowGraphBuilder } from "../contracts/IWorkflowGraphBuilder";
import type {
  WorkflowMetadataSnapshot,
  WorkflowRuntimeGraph,
} from "../models/WorkflowModels";

export class WorkflowGraphBuilder implements IWorkflowGraphBuilder {
  build(snapshot: WorkflowMetadataSnapshot): WorkflowRuntimeGraph {
    const nodes = [...snapshot.states]
      .sort((a, b) => a.sequence - b.sequence)
      .map((state) => ({
        code: state.code,
        name: state.name,
        isInitial: state.isInitial,
        isTerminal: state.isTerminal,
        sequence: state.sequence,
      }));

    const edges = [...snapshot.transitions]
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.sequence - b.sequence;
      })
      .map((transition) => ({
        code: transition.code,
        from: transition.sourceStateCode,
        to: transition.destinationStateCode,
        actionCode: transition.actionCode,
        priority: transition.priority,
        conditionId: transition.conditionId,
        permissionCode: transition.permissionCode,
        rollbackFlag: transition.rollbackFlag,
        compensationActionCode: transition.compensationActionCode,
        retryPolicy: transition.retryPolicy,
        timeoutSeconds: transition.timeoutSeconds,
        parallelMode: transition.parallelMode,
        exclusiveGroupCode: transition.exclusiveGroupCode,
        asyncExecution: transition.asyncExecution,
      }));

    const outgoingByState: Record<string, string[]> = {};
    const incomingByState: Record<string, string[]> = {};
    const transitionsBySourceState: Record<string, typeof edges> = {};

    for (const node of nodes) {
      outgoingByState[node.code] = [];
      incomingByState[node.code] = [];
      transitionsBySourceState[node.code] = [];
    }

    for (const edge of edges) {
      if (!outgoingByState[edge.from]) {
        outgoingByState[edge.from] = [];
      }
      if (!incomingByState[edge.to]) {
        incomingByState[edge.to] = [];
      }
      if (!transitionsBySourceState[edge.from]) {
        transitionsBySourceState[edge.from] = [];
      }

      outgoingByState[edge.from].push(edge.to);
      incomingByState[edge.to].push(edge.from);
      transitionsBySourceState[edge.from].push(edge);
    }

    return {
      workflowGraph: {
        nodes,
        edges,
      },
      stateGraph: {
        states: nodes,
        outgoingByState,
        incomingByState,
      },
      transitionGraph: {
        transitions: edges,
        transitionsBySourceState,
      },
    };
  }
}
