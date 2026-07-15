import type { IStateMachineEngine } from "../contracts/IStateMachineEngine";
import type {
  WorkflowMetadataSnapshot,
  WorkflowRuntimeModel,
} from "../models/WorkflowModels";

export class StateMachineEngine implements IStateMachineEngine {
  async buildRuntimeModel(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowRuntimeModel> {
    const nodes = snapshot.states.map((state) => ({
      code: state.code,
      name: state.name,
      isInitial: state.isInitial,
      isTerminal: state.isTerminal,
      sequence: state.sequence,
    }));

    const edges = snapshot.transitions.map((transition) => ({
      code: transition.code,
      from: transition.sourceStateCode,
      to: transition.destinationStateCode,
      actionCode: transition.actionCode,
      priority: transition.priority,
      rollbackFlag: transition.rollbackFlag,
      compensationActionCode: transition.compensationActionCode,
      retryPolicy: transition.retryPolicy,
      timeoutSeconds: transition.timeoutSeconds,
      parallelMode: transition.parallelMode,
      exclusiveGroupCode: transition.exclusiveGroupCode,
      asyncExecution: transition.asyncExecution,
    }));

    return {
      workflowDefinitionId: snapshot.definition.id,
      workflowVersionId: snapshot.version.id,
      initialStateCode: nodes.find((node) => node.isInitial)?.code,
      graph: {
        nodes,
        edges,
      },
      assignments: snapshot.assignments,
      variables: snapshot.variables.map((item) => ({
        code: item.code,
        dataType: item.dataType,
        required: item.isRequired,
        defaultValue: item.defaultValue,
      })),
    };
  }
}
