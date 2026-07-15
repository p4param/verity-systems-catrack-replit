import type { IWorkflowSimulationService } from "../contracts/IWorkflowSimulationService";
import { TransitionEngine } from "./TransitionEngine";
import type { ITransitionEngine } from "../contracts/ITransitionEngine";
import type {
  WorkflowExecutionContext,
  WorkflowSimulationResult,
} from "../models/WorkflowModels";

export class WorkflowSimulationService implements IWorkflowSimulationService {
  constructor(private readonly transitionEngine: ITransitionEngine = new TransitionEngine()) {}

  async simulate(context: WorkflowExecutionContext): Promise<WorkflowSimulationResult> {
    const manifest = context.runtimeContext.workflowManifest as any;
    const runtimeModel = manifest?.runtimeModel;
    const initial = runtimeModel?.graph?.nodes?.find((state: any) => state.isInitial);
    const available = initial
      ? await this.transitionEngine.getAvailableTransitions(runtimeModel, initial.code)
      : [];

    return {
      success: true,
      workflowVersionId: context.workflowVersionId ?? manifest?.workflowVersionId ?? "",
      visitedStates: initial ? [initial.code] : [],
      visitedTransitions: available.map((item) => item.code),
      diagnostics: {
        mode: "FoundationOnly",
        message: "Workflow execution is not part of this milestone. Simulation returns metadata bootstrap path only.",
      },
    };
  }
}
