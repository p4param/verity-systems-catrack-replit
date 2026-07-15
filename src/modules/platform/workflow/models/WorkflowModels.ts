import type * as DesignerModels from "./DesignerModels";
import type * as RuntimeModels from "./RuntimeModels";

export * from "./DesignerModels";
export * from "./RuntimeModels";

export namespace Designer {
  export type WorkflowDefinition = DesignerModels.WorkflowDefinition;
  export type WorkflowVersion = DesignerModels.WorkflowVersion;
  export type WorkflowState = DesignerModels.WorkflowState;
  export type WorkflowTransition = DesignerModels.WorkflowTransition;
  export type WorkflowCondition = DesignerModels.WorkflowCondition;
  export type WorkflowRule = DesignerModels.WorkflowRule;
  export type WorkflowAction = DesignerModels.WorkflowAction;
  export type WorkflowAssignment = DesignerModels.WorkflowAssignment;
  export type WorkflowApprover = DesignerModels.WorkflowApprover;
  export type WorkflowNotification = DesignerModels.WorkflowNotification;
  export type WorkflowEscalation = DesignerModels.WorkflowEscalation;
  export type WorkflowSLA = DesignerModels.WorkflowSLA;
  export type WorkflowVariable = DesignerModels.WorkflowVariable;
  export type WorkflowRole = DesignerModels.WorkflowRole;
  export type WorkflowGroup = DesignerModels.WorkflowGroup;
  export type WorkflowPermission = DesignerModels.WorkflowPermission;
  export type WorkflowExpression = DesignerModels.WorkflowExpression;
  export type WorkflowMetadataSnapshot = DesignerModels.WorkflowMetadataSnapshot;
  export type WorkflowVariableDataType = DesignerModels.WorkflowVariableDataType;
  export type WorkflowVersionStatus = DesignerModels.WorkflowVersionStatus;
}

export namespace Runtime {
  export type WorkflowManifest = RuntimeModels.WorkflowManifest;
  export type WorkflowNode = RuntimeModels.WorkflowNode;
  export type WorkflowEdge = RuntimeModels.WorkflowEdge;
  export type WorkflowGraph = RuntimeModels.WorkflowGraph;
  export type WorkflowStateGraph = RuntimeModels.WorkflowStateGraph;
  export type WorkflowTransitionGraph = RuntimeModels.WorkflowTransitionGraph;
  export type WorkflowRuntimeGraph = RuntimeModels.WorkflowRuntimeGraph;
  export type WorkflowRuntimeModel = RuntimeModels.WorkflowRuntimeModel;
  export type WorkflowTransitionCandidate = RuntimeModels.WorkflowTransitionCandidate;
  export type WorkflowTransitionResolutionContext = RuntimeModels.WorkflowTransitionResolutionContext;
  export type WorkflowTransitionResolutionResult = RuntimeModels.WorkflowTransitionResolutionResult;
  export type WorkflowConditionEvaluationResult = RuntimeModels.WorkflowConditionEvaluationResult;
  export type WorkflowExecutionContext = RuntimeModels.WorkflowExecutionContext;
  export type WorkflowValidationResult = RuntimeModels.WorkflowValidationResult;
  export type WorkflowValidationIssue = RuntimeModels.WorkflowValidationIssue;
  export type WorkflowPublishResult = RuntimeModels.WorkflowPublishResult;
  export type WorkflowSimulationResult = RuntimeModels.WorkflowSimulationResult;
}
