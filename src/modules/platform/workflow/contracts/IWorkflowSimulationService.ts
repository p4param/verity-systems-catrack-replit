import type {
  WorkflowExecutionContext,
  WorkflowSimulationResult,
} from "../models/WorkflowModels";

export interface IWorkflowSimulationService {
  simulate(context: WorkflowExecutionContext): Promise<WorkflowSimulationResult>;
}
