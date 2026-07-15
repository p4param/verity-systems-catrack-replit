import type { IWorkflowEngine } from "../contracts/IWorkflowEngine";
import type { IStateMachineEngine } from "../contracts/IStateMachineEngine";
import type { ITransitionEngine } from "../contracts/ITransitionEngine";
import type { IParticipantResolutionEngine } from "../contracts/IParticipantResolutionEngine";
import type { IWorkflowActionEngine } from "../contracts/IWorkflowActionEngine";
import type { IWorkflowPolicyEngine } from "../contracts/IWorkflowPolicyEngine";
import type { IRuntimeEffectPlanner } from "../contracts/IRuntimeEffectPlanner";
import type { IWorkflowExecutionOrchestrator } from "../contracts/IWorkflowExecutionOrchestrator";
import type { IWorkflowPlanExecutor } from "../contracts/IWorkflowPlanExecutor";
import type { IExecutionPlanBuilder } from "../contracts/IExecutionPlanBuilder";
import type { IExecutionMapper } from "../contracts/IExecutionMapper";
import type { IExecutionPipeline } from "../contracts/IExecutionPipeline";
import type { IWorkflowExecutorRegistry } from "../contracts/IWorkflowExecutorRegistry";
import type { IExecutionDiagnosticsQueryFacade } from "../contracts/IExecutionDiagnostics";
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
import { ExecutionMapper } from "./ExecutionMapper";
import { RuntimeEffectGraphBuilder } from "./RuntimeEffectGraphBuilder";
import { ExecutionPlanBuilder } from "./ExecutionPlanBuilder";
import { ExecutionDispatchStage } from "./ExecutionDispatchStage";
import { ExecutionPipeline } from "./ExecutionPipeline";
import { ExecutionPlanningStage } from "./ExecutionPlanningStage";
import { DeferredWorkflowPlanExecutor } from "./DeferredWorkflowPlanExecutor";
import { DeferredWorkflowExecutor } from "./DeferredWorkflowExecutor";
import { RuntimeApplicationExecutor } from "./RuntimeApplicationExecutor";
import { WorkflowExecutionOrchestrator } from "./WorkflowExecutionOrchestrator";
import { WorkflowExecutorRegistry } from "./WorkflowExecutorRegistry";
import { InMemoryExecutionDiagnosticsQueryFacade } from "./InMemoryExecutionDiagnosticsQueryFacade";
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
    ),
    private readonly executionPlanBuilder: IExecutionPlanBuilder = new ExecutionPlanBuilder(),
    private readonly executionMapper: IExecutionMapper = new ExecutionMapper(),
    private readonly planExecutor: IWorkflowPlanExecutor = new DeferredWorkflowPlanExecutor(),
    private readonly workflowExecutorRegistry: IWorkflowExecutorRegistry = (() => {
      const registry = new WorkflowExecutorRegistry();
      registry.register(new RuntimeApplicationExecutor());
      registry.register(new DeferredWorkflowExecutor());
      return registry;
    })(),
    private readonly executionPipeline: IExecutionPipeline = (() => {
      const pipeline = new ExecutionPipeline();
      pipeline.registerStage(new ExecutionPlanningStage());
      pipeline.registerStage(new ExecutionDispatchStage(executionMapper, workflowExecutorRegistry));
      return pipeline;
    })(),
    private readonly executionDiagnosticsQueryFacade: IExecutionDiagnosticsQueryFacade =
      new InMemoryExecutionDiagnosticsQueryFacade(),
    private readonly executionOrchestrator: IWorkflowExecutionOrchestrator = new WorkflowExecutionOrchestrator(
      actionEngine,
      policyEngine,
      runtimeEffectPlanner,
      executionPlanBuilder,
      executionPipeline,
      undefined,
      executionDiagnosticsQueryFacade
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

  getExecutionOrchestrator(): IWorkflowExecutionOrchestrator {
    return this.executionOrchestrator;
  }

  getExecutionPipeline(): IExecutionPipeline {
    return this.executionPipeline;
  }

  getWorkflowExecutorRegistry(): IWorkflowExecutorRegistry {
    return this.workflowExecutorRegistry;
  }

  getExecutionDiagnosticsQueryFacade(): IExecutionDiagnosticsQueryFacade {
    return this.executionDiagnosticsQueryFacade;
  }
}
