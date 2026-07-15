import type { IWorkflowEngine } from "../contracts/IWorkflowEngine";
import type { IStateMachineEngine } from "../contracts/IStateMachineEngine";
import type { ITransitionEngine } from "../contracts/ITransitionEngine";
import type { IParticipantResolutionEngine } from "../contracts/IParticipantResolutionEngine";
import type { IWorkflowActionEngine } from "../contracts/IWorkflowActionEngine";
import type { IWorkflowPolicyEngine } from "../contracts/IWorkflowPolicyEngine";
import type { IRuntimeEffectPlanner } from "../contracts/IRuntimeEffectPlanner";
import type { IWorkflowPublisher } from "../contracts/IWorkflowPublisher";
import type { IWorkflowSimulationService } from "../contracts/IWorkflowSimulationService";
import type { IWorkflowValidator } from "../contracts/IWorkflowValidator";
import { StateMachineEngine } from "./StateMachineEngine";
import { TransitionEngine } from "./TransitionEngine";
import { ParticipantResolutionEngine } from "./ParticipantResolutionEngine";
import { ParticipantRegistry } from "./ParticipantRegistry";
import { AssignmentStrategyEngine } from "./AssignmentStrategyEngine";
import { AssignmentPlanner } from "./AssignmentPlanner";
import { WorkflowActionRegistry } from "./WorkflowActionRegistry";
import { WorkflowActionEngine } from "./WorkflowActionEngine";
import { WorkflowPolicyEngine } from "./WorkflowPolicyEngine";
import { RuntimeEffectPlanner } from "./RuntimeEffectPlanner";
import { RuntimeEffectGraphBuilder } from "./RuntimeEffectGraphBuilder";
import { UserParticipantProvider } from "./participant-providers/UserParticipantProvider";
import {
  ApiActionProvider,
  CustomActionProvider,
  DocumentActionProvider,
  EventActionProvider,
  NotificationActionProvider,
  PlatformActionProvider,
  ReportActionProvider,
} from "./action-providers";
import { GenericPolicyProvider } from "./policy-providers";
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
    private readonly transitionEngine: ITransitionEngine = new TransitionEngine(),
    private readonly participantResolutionEngine: IParticipantResolutionEngine = new ParticipantResolutionEngine(
      (() => {
        const registry = new ParticipantRegistry();
        registry.register(new UserParticipantProvider());
        return registry;
      })(),
      new AssignmentStrategyEngine(),
      new AssignmentPlanner()
    ),
    private readonly actionEngine: IWorkflowActionEngine = new WorkflowActionEngine(
      (() => {
        const registry = new WorkflowActionRegistry();
        registry.register(new PlatformActionProvider());
        registry.register(new ApiActionProvider());
        registry.register(new DocumentActionProvider());
        registry.register(new ReportActionProvider());
        registry.register(new EventActionProvider());
        registry.register(new NotificationActionProvider());
        registry.register(new CustomActionProvider());
        return registry;
      })()
    ),
    private readonly policyEngine: IWorkflowPolicyEngine = new WorkflowPolicyEngine([
      new GenericPolicyProvider(),
    ]),
    private readonly runtimeEffectPlanner: IRuntimeEffectPlanner = new RuntimeEffectPlanner(
      new RuntimeEffectGraphBuilder()
    )
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

  getParticipantResolutionEngine(): IParticipantResolutionEngine {
    return this.participantResolutionEngine;
  }

  getActionEngine(): IWorkflowActionEngine {
    return this.actionEngine;
  }

  getPolicyEngine(): IWorkflowPolicyEngine {
    return this.policyEngine;
  }

  getRuntimeEffectPlanner(): IRuntimeEffectPlanner {
    return this.runtimeEffectPlanner;
  }
}
