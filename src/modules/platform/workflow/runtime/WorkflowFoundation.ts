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
import type { IWorkflowValidator } from "../contracts/IWorkflowValidator";
import type { IWorkflowVersionManager } from "../contracts/IWorkflowVersionManager";
import { WorkflowRepository } from "../repositories/WorkflowRepository";
import { RuntimeExpressionAdapter } from "../services/RuntimeExpressionAdapter";
import { StateResolver } from "../services/StateResolver";
import { StateMachineEngine } from "../services/StateMachineEngine";
import { TransitionResolver } from "../services/TransitionResolver";
import { TransitionEngine } from "../services/TransitionEngine";
import { WorkflowEngine } from "../services/WorkflowEngine";
import { WorkflowGraphBuilder } from "../services/WorkflowGraphBuilder";
import { WorkflowGraphValidator } from "../services/WorkflowGraphValidator";
import { WorkflowManifestGenerator } from "../services/WorkflowManifestGenerator";
import { WorkflowMetadataProvider } from "../services/WorkflowMetadataProvider";
import { WorkflowMetadataNormalizer } from "../services/WorkflowMetadataNormalizer";
import { WorkflowMetadataOptimizer } from "../services/WorkflowMetadataOptimizer";
import { WorkflowPublisher } from "../services/WorkflowPublisher";
import { WorkflowSimulationService } from "../services/WorkflowSimulationService";
import { WorkflowValidator } from "../services/WorkflowValidator";
import { WorkflowVersionManager } from "../services/WorkflowVersionManager";
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
}

export function createWorkflowFoundation(
  repository: IWorkflowRepository = new WorkflowRepository()
): WorkflowFoundation {
  const expressionAdapter = new RuntimeExpressionAdapter();
  const workflowGraphBuilder = new WorkflowGraphBuilder();
  const workflowGraphValidator = new WorkflowGraphValidator();
  const stateResolver = new StateResolver();
  const transitionResolver = new TransitionResolver();
  const stateMachineEngine = new StateMachineEngine(workflowGraphBuilder, workflowGraphValidator, stateResolver);
  const transitionEngine = new TransitionEngine(transitionResolver, workflowGraphValidator);
  const validator = new WorkflowValidator(expressionAdapter);
  const manifestGenerator = new WorkflowManifestGenerator(stateMachineEngine);
  const publisher = new WorkflowPublisher(
    repository,
    validator,
    manifestGenerator,
    new WorkflowMetadataNormalizer(),
    new WorkflowMetadataOptimizer()
  );
  const metadataProvider = new WorkflowMetadataProvider(repository);
  const simulationService = new WorkflowSimulationService(transitionEngine);
  const versionManager = new WorkflowVersionManager();
  const engine = new WorkflowEngine(
    validator,
    publisher,
    simulationService,
    stateMachineEngine,
    transitionEngine
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
    stateResolver,
    transitionResolver,
    workflowGraphBuilder,
    workflowGraphValidator,
  };
}
