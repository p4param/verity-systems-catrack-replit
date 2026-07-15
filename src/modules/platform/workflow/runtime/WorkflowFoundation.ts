import type { IWorkflowEngine } from "../contracts/IWorkflowEngine";
import type { IWorkflowManifestGenerator } from "../contracts/IWorkflowManifestGenerator";
import type { IWorkflowMetadataProvider } from "../contracts/IWorkflowMetadataProvider";
import type { IWorkflowMiddleware } from "../contracts/IWorkflowMiddleware";
import type { IWorkflowPublisher } from "../contracts/IWorkflowPublisher";
import type { IWorkflowRepository } from "../contracts/IWorkflowRepository";
import type { IWorkflowSimulationService } from "../contracts/IWorkflowSimulationService";
import type { IStateMachineEngine } from "../contracts/IStateMachineEngine";
import type { ITransitionEngine } from "../contracts/ITransitionEngine";
import type { IStateResolver } from "../contracts/IStateResolver";
import type { ITransitionResolver } from "../contracts/ITransitionResolver";
import type { IWorkflowGraphBuilder } from "../contracts/IWorkflowGraphBuilder";
import type { IWorkflowGraphValidator } from "../contracts/IWorkflowGraphValidator";
import type { IParticipantResolutionEngine } from "../contracts/IParticipantResolutionEngine";
import type { IParticipantRegistry } from "../contracts/IParticipantRegistry";
import type { IAssignmentStrategyEngine } from "../contracts/IAssignmentStrategyEngine";
import type { IAssignmentPlanner } from "../contracts/IAssignmentPlanner";
import type { IParticipantValidator } from "../contracts/IParticipantValidator";
import type { IParticipantManifestGenerator } from "../contracts/IParticipantManifestGenerator";
import type { IHierarchyResolver } from "../contracts/IHierarchyResolver";
import type { IWorkflowActionRegistry } from "../contracts/IWorkflowActionRegistry";
import type { IWorkflowActionEngine } from "../contracts/IWorkflowActionEngine";
import type { IWorkflowPolicyEngine } from "../contracts/IWorkflowPolicyEngine";
import type { IRuntimeEffectGraphBuilder } from "../contracts/IRuntimeEffectGraphBuilder";
import type { IRuntimeEffectPlanner } from "../contracts/IRuntimeEffectPlanner";
import type { IExecutionPlanBuilder } from "../contracts/IExecutionPlanBuilder";
import type { IExecutionMapper } from "../contracts/IExecutionMapper";
import type { IExecutionPipeline } from "../contracts/IExecutionPipeline";
import type { IExecutionDiagnosticsQueryFacade } from "../contracts/IExecutionDiagnostics";
import type { IWorkflowActionValidator } from "../contracts/IWorkflowActionValidator";
import type { IWorkflowPlanExecutor } from "../contracts/IWorkflowPlanExecutor";
import type { IWorkflowExecutionOrchestrator } from "../contracts/IWorkflowExecutionOrchestrator";
import type { IWorkflowExecutorRegistry } from "../contracts/IWorkflowExecutorRegistry";
import type { IWorkflowValidator } from "../contracts/IWorkflowValidator";
import type { IWorkflowVersionManager } from "../contracts/IWorkflowVersionManager";
import { WorkflowRepository } from "../repositories/WorkflowRepository";
import { AssignmentPlanner } from "../services/AssignmentPlanner";
import { AssignmentStrategyEngine } from "../services/AssignmentStrategyEngine";
import { ExecutionPlanBuilder } from "../services/ExecutionPlanBuilder";
import { ExecutionDispatchStage } from "../services/ExecutionDispatchStage";
import { ExecutionMapper } from "../services/ExecutionMapper";
import { ExecutionPipeline } from "../services/ExecutionPipeline";
import { ExecutionPlanningStage } from "../services/ExecutionPlanningStage";
import { InMemoryExecutionDiagnosticsQueryFacade } from "../services/InMemoryExecutionDiagnosticsQueryFacade";
import { DeferredWorkflowPlanExecutor } from "../services/DeferredWorkflowPlanExecutor";
import { DeferredWorkflowExecutor } from "../services/DeferredWorkflowExecutor";
import { RuntimeApplicationExecutor } from "../services/RuntimeApplicationExecutor";
import { HierarchyResolver } from "../services/HierarchyResolver";
import { ParticipantManifestGenerator } from "../services/ParticipantManifestGenerator";
import { ParticipantRegistry } from "../services/ParticipantRegistry";
import { ParticipantResolutionEngine } from "../services/ParticipantResolutionEngine";
import { ParticipantValidator } from "../services/ParticipantValidator";
import { RuntimeEffectGraphBuilder } from "../services/RuntimeEffectGraphBuilder";
import { RuntimeEffectPlanner } from "../services/RuntimeEffectPlanner";
import { RuntimeExpressionAdapter } from "../services/RuntimeExpressionAdapter";
import { StateResolver } from "../services/StateResolver";
import { StateMachineEngine } from "../services/StateMachineEngine";
import { TransitionResolver } from "../services/TransitionResolver";
import { TransitionEngine } from "../services/TransitionEngine";
import { WorkflowActionEngine } from "../services/WorkflowActionEngine";
import { WorkflowActionRegistry } from "../services/WorkflowActionRegistry";
import { WorkflowActionValidator } from "../services/WorkflowActionValidator";
import { WorkflowExecutionOrchestrator } from "../services/WorkflowExecutionOrchestrator";
import { WorkflowExecutorRegistry } from "../services/WorkflowExecutorRegistry";
import { WorkflowEngine } from "../services/WorkflowEngine";
import { WorkflowGraphBuilder } from "../services/WorkflowGraphBuilder";
import { WorkflowGraphValidator } from "../services/WorkflowGraphValidator";
import { WorkflowManifestGenerator } from "../services/WorkflowManifestGenerator";
import { WorkflowMetadataProvider } from "../services/WorkflowMetadataProvider";
import { WorkflowMetadataNormalizer } from "../services/WorkflowMetadataNormalizer";
import { WorkflowMetadataOptimizer } from "../services/WorkflowMetadataOptimizer";
import { WorkflowPolicyEngine } from "../services/WorkflowPolicyEngine";
import { WorkflowPublisher } from "../services/WorkflowPublisher";
import { WorkflowSimulationService } from "../services/WorkflowSimulationService";
import { WorkflowValidator } from "../services/WorkflowValidator";
import { WorkflowVersionManager } from "../services/WorkflowVersionManager";
import {
  ApiActionProvider,
  CustomActionProvider,
  DocumentActionProvider,
  EventActionProvider,
  NotificationActionProvider,
  PlatformActionProvider,
  ReportActionProvider,
} from "../services/action-providers";
import { GenericPolicyProvider } from "../services/policy-providers";
import {
  ExpressionParticipantProvider,
  GroupParticipantProvider,
  HierarchyParticipantProvider,
  LookupParticipantProvider,
  RoleParticipantProvider,
  UserParticipantProvider,
} from "../services/participant-providers";
import { WorkflowMiddleware } from "./WorkflowMiddleware";

export interface WorkflowFoundation {
  workflowEngine: IWorkflowEngine;
  workflowRepository: IWorkflowRepository;
  workflowManifestGenerator: IWorkflowManifestGenerator;
  workflowValidator: IWorkflowValidator;
  workflowPublisher: IWorkflowPublisher;
  workflowMetadataProvider: IWorkflowMetadataProvider;
  workflowMiddleware: IWorkflowMiddleware;
  workflowVersionManager: IWorkflowVersionManager;
  workflowSimulationService: IWorkflowSimulationService;
  stateMachineEngine: IStateMachineEngine;
  transitionEngine: ITransitionEngine;
  stateResolver: IStateResolver;
  transitionResolver: ITransitionResolver;
  workflowGraphBuilder: IWorkflowGraphBuilder;
  workflowGraphValidator: IWorkflowGraphValidator;
  participantResolutionEngine: IParticipantResolutionEngine;
  participantRegistry: IParticipantRegistry;
  assignmentStrategyEngine: IAssignmentStrategyEngine;
  assignmentPlanner: IAssignmentPlanner;
  participantValidator: IParticipantValidator;
  participantManifestGenerator: IParticipantManifestGenerator;
  hierarchyResolver: IHierarchyResolver;
  workflowActionRegistry: IWorkflowActionRegistry;
  workflowActionEngine: IWorkflowActionEngine;
  workflowPolicyEngine: IWorkflowPolicyEngine;
  runtimeEffectGraphBuilder: IRuntimeEffectGraphBuilder;
  runtimeEffectPlanner: IRuntimeEffectPlanner;
  executionPlanBuilder: IExecutionPlanBuilder;
  executionMapper: IExecutionMapper;
  executionPipeline: IExecutionPipeline;
  executionDiagnosticsQueryFacade: IExecutionDiagnosticsQueryFacade;
  workflowExecutorRegistry: IWorkflowExecutorRegistry;
  workflowActionValidator: IWorkflowActionValidator;
  workflowPlanExecutor: IWorkflowPlanExecutor;
  workflowExecutionOrchestrator: IWorkflowExecutionOrchestrator;
}

export function createWorkflowFoundation(
  repository: IWorkflowRepository = new WorkflowRepository()
): WorkflowFoundation {
  const expressionAdapter = new RuntimeExpressionAdapter();
  const workflowGraphBuilder = new WorkflowGraphBuilder();
  const workflowGraphValidator = new WorkflowGraphValidator();
  const hierarchyResolver = new HierarchyResolver();
  const participantRegistry = new ParticipantRegistry();
  participantRegistry.register(new UserParticipantProvider());
  participantRegistry.register(new RoleParticipantProvider());
  participantRegistry.register(new GroupParticipantProvider());
  participantRegistry.register(new ExpressionParticipantProvider());
  participantRegistry.register(new LookupParticipantProvider());
  participantRegistry.register(new HierarchyParticipantProvider(hierarchyResolver));

  const assignmentStrategyEngine = new AssignmentStrategyEngine();
  const assignmentPlanner = new AssignmentPlanner();
  const participantResolutionEngine = new ParticipantResolutionEngine(
    participantRegistry,
    assignmentStrategyEngine,
    assignmentPlanner
  );
  const participantValidator = new ParticipantValidator(participantRegistry, hierarchyResolver);
  const participantManifestGenerator = new ParticipantManifestGenerator();
  const workflowActionRegistry = new WorkflowActionRegistry();
  workflowActionRegistry.register(new PlatformActionProvider());
  workflowActionRegistry.register(new ApiActionProvider());
  workflowActionRegistry.register(new DocumentActionProvider());
  workflowActionRegistry.register(new ReportActionProvider());
  workflowActionRegistry.register(new EventActionProvider());
  workflowActionRegistry.register(new NotificationActionProvider());
  workflowActionRegistry.register(new CustomActionProvider());
  const policyProviders = [new GenericPolicyProvider()];
  const workflowActionEngine = new WorkflowActionEngine(workflowActionRegistry);
  const workflowPolicyEngine = new WorkflowPolicyEngine(policyProviders);
  const runtimeEffectGraphBuilder = new RuntimeEffectGraphBuilder();
  const runtimeEffectPlanner = new RuntimeEffectPlanner(runtimeEffectGraphBuilder);
  const executionPlanBuilder = new ExecutionPlanBuilder();
  const executionMapper = new ExecutionMapper();
  const executionDiagnosticsQueryFacade = new InMemoryExecutionDiagnosticsQueryFacade();
  const workflowExecutorRegistry = new WorkflowExecutorRegistry();
  workflowExecutorRegistry.register(new RuntimeApplicationExecutor());
  workflowExecutorRegistry.register(new DeferredWorkflowExecutor());
  const executionPipeline = new ExecutionPipeline();
  executionPipeline.registerStage(new ExecutionPlanningStage());
  executionPipeline.registerStage(new ExecutionDispatchStage(executionMapper, workflowExecutorRegistry));
  const workflowActionValidator = new WorkflowActionValidator(workflowActionRegistry, policyProviders);
  const workflowPlanExecutor = new DeferredWorkflowPlanExecutor();
  const workflowExecutionOrchestrator = new WorkflowExecutionOrchestrator(
    workflowActionEngine,
    workflowPolicyEngine,
    runtimeEffectPlanner,
    executionPlanBuilder,
    executionPipeline,
    undefined,
    executionDiagnosticsQueryFacade
  );

  const stateResolver = new StateResolver();
  const transitionResolver = new TransitionResolver();
  const stateMachineEngine = new StateMachineEngine(workflowGraphBuilder, workflowGraphValidator, stateResolver);
  const transitionEngine = new TransitionEngine(transitionResolver, workflowGraphValidator);
  const validator = new WorkflowValidator(expressionAdapter);
  const manifestGenerator = new WorkflowManifestGenerator(
    stateMachineEngine,
    participantManifestGenerator,
    workflowActionEngine,
    workflowPolicyEngine,
    runtimeEffectPlanner,
    executionPlanBuilder
  );
  const publisher = new WorkflowPublisher(
    repository,
    validator,
    manifestGenerator,
    new WorkflowMetadataNormalizer(),
    new WorkflowMetadataOptimizer(),
    participantValidator,
    workflowActionValidator
  );
  const metadataProvider = new WorkflowMetadataProvider(repository);
  const simulationService = new WorkflowSimulationService(transitionEngine);
  const versionManager = new WorkflowVersionManager();
  const engine = new WorkflowEngine(
    validator,
    publisher,
    simulationService,
    stateMachineEngine,
    transitionEngine,
    participantResolutionEngine,
    workflowActionEngine,
    workflowPolicyEngine,
    runtimeEffectPlanner,
    executionPlanBuilder,
    workflowPlanExecutor,
    workflowExecutorRegistry,
    executionPipeline,
    executionDiagnosticsQueryFacade,
    workflowExecutionOrchestrator
  );
  const middleware = new WorkflowMiddleware(metadataProvider);

  return {
    workflowEngine: engine,
    workflowRepository: repository,
    workflowManifestGenerator: manifestGenerator,
    workflowValidator: validator,
    workflowPublisher: publisher,
    workflowMetadataProvider: metadataProvider,
    workflowMiddleware: middleware,
    workflowVersionManager: versionManager,
    workflowSimulationService: simulationService,
    stateMachineEngine,
    transitionEngine,
    participantResolutionEngine,
    stateResolver,
    transitionResolver,
    workflowGraphBuilder,
    workflowGraphValidator,
    participantRegistry,
    assignmentStrategyEngine,
    assignmentPlanner,
    participantValidator,
    participantManifestGenerator,
    hierarchyResolver,
    workflowActionRegistry,
    workflowActionEngine,
    workflowPolicyEngine,
    runtimeEffectGraphBuilder,
    runtimeEffectPlanner,
    executionPlanBuilder,
    executionMapper,
    executionPipeline,
    executionDiagnosticsQueryFacade,
    workflowExecutorRegistry,
    workflowActionValidator,
    workflowPlanExecutor,
    workflowExecutionOrchestrator,
  };
}
