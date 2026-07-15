import type { IWorkflowEngine } from "../contracts/IWorkflowEngine";
import type { IStateMachineEngine } from "../contracts/IStateMachineEngine";
import type { ITransitionEngine } from "../contracts/ITransitionEngine";
import type { IWorkflowPublisher } from "../contracts/IWorkflowPublisher";
import type { IWorkflowSimulationService } from "../contracts/IWorkflowSimulationService";
import type { IWorkflowValidator } from "../contracts/IWorkflowValidator";
import { StateMachineEngine } from "./StateMachineEngine";
import { TransitionEngine } from "./TransitionEngine";
import type {
  WorkflowExecutionContext,
  WorkflowMetadataSnapshot,
  WorkflowPublishResult,
  WorkflowSimulationResult,
  WorkflowValidationResult,
} from "../models/WorkflowModels";

export class WorkflowEngine implements IWorkflowEngine {
  constructor(
    private readonly validator: IWorkflowValidator,
    private readonly publisher: IWorkflowPublisher,
    private readonly simulationService: IWorkflowSimulationService,
    private readonly stateMachineEngine: IStateMachineEngine = new StateMachineEngine(),
    private readonly transitionEngine: ITransitionEngine = new TransitionEngine()
  ) {}

  validateMetadata(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowValidationResult> {
    return this.validator.validate(snapshot);
  }

  publish(snapshot: WorkflowMetadataSnapshot, actorUserId: string): Promise<WorkflowPublishResult> {
    return this.publisher.publish(snapshot, actorUserId);
  }

  simulate(context: WorkflowExecutionContext): Promise<WorkflowSimulationResult> {
    return this.simulationService.simulate(context);
  }

  getStateMachineEngine(): IStateMachineEngine {
    return this.stateMachineEngine;
  }

  getTransitionEngine(): ITransitionEngine {
    return this.transitionEngine;
  }
}
