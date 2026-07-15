import type { IStateMachineEngine } from "../contracts/IStateMachineEngine";
import type { IStateResolver } from "../contracts/IStateResolver";
import type { IWorkflowGraphBuilder } from "../contracts/IWorkflowGraphBuilder";
import type { IWorkflowGraphValidator } from "../contracts/IWorkflowGraphValidator";
import { StateResolver } from "./StateResolver";
import { WorkflowGraphBuilder } from "./WorkflowGraphBuilder";
import { WorkflowGraphValidator } from "./WorkflowGraphValidator";
import type {
  WorkflowMetadataSnapshot,
  WorkflowNode,
  WorkflowRuntimeGraph,
  WorkflowRuntimeModel,
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

export class StateMachineEngine implements IStateMachineEngine {
  constructor(
    private readonly graphBuilder: IWorkflowGraphBuilder = new WorkflowGraphBuilder(),
    private readonly graphValidator: IWorkflowGraphValidator = new WorkflowGraphValidator(),
    private readonly stateResolver: IStateResolver = new StateResolver()
  ) {}

  registerStates(states: WorkflowNode[]): readonly WorkflowNode[] {
    return deepFreeze([...states].sort((a, b) => a.sequence - b.sequence));
  }

  resolveInitialState(runtimeModel: WorkflowRuntimeModel): WorkflowNode | null {
    return this.stateResolver.resolveInitialState(runtimeModel);
  }

  isTerminalState(runtimeModel: WorkflowRuntimeModel, stateCode: string): boolean {
    return this.stateResolver.isTerminalState(runtimeModel, stateCode);
  }

  validateStateGraph(graph: WorkflowRuntimeGraph): WorkflowValidationIssue[] {
    const issues = this.graphValidator.validate(graph);
    const stateCodes = new Set([
      "WF_MISSING_INITIAL_STATE",
      "WF_MULTIPLE_INITIAL_STATES",
      "WF_ORPHAN_STATE",
      "WF_DEAD_END_STATE",
      "WF_CIRCULAR_PATH",
      "WF_INVALID_TERMINAL_STATE",
      "WF_INVALID_TRANSITION_STATE",
    ]);
    return issues.filter((item) => stateCodes.has(item.code));
  }

  generateGraph(snapshot: WorkflowMetadataSnapshot): WorkflowRuntimeGraph {
    return deepFreeze(this.graphBuilder.build(snapshot));
  }

  async buildRuntimeModel(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowRuntimeModel> {
    const runtimeGraph = this.generateGraph(snapshot);
    const runtimeModelForResolution: WorkflowRuntimeModel = {
      workflowDefinitionId: snapshot.definition.id,
      workflowVersionId: snapshot.version.id,
      initialStateCode: undefined,
      graph: runtimeGraph.workflowGraph,
      runtimeGraph,
      assignments: snapshot.assignments,
      variables: snapshot.variables.map((item) => ({
        code: item.code,
        dataType: item.dataType,
        required: item.isRequired,
        defaultValue: item.defaultValue,
      })),
    };

    const stateResolverIssues = this.stateResolver.validateStates(runtimeModelForResolution);
    const validationIssues = [...stateResolverIssues, ...this.validateStateGraph(runtimeGraph)].filter(
      (item) => item.severity === "Error"
    );
    if (validationIssues.length > 0) {
      const message = validationIssues.map((item) => item.message).join("; ");
      throw new Error(`Invalid state graph: ${message}`);
    }

    const runtimeModel: WorkflowRuntimeModel = {
      workflowDefinitionId: snapshot.definition.id,
      workflowVersionId: snapshot.version.id,
      initialStateCode: this.resolveInitialState(runtimeModelForResolution)?.code,
      graph: runtimeGraph.workflowGraph,
      runtimeGraph,
      assignments: snapshot.assignments,
      variables: runtimeModelForResolution.variables,
    };

    return deepFreeze(runtimeModel);
  }
}
