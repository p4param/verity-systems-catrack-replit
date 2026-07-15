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
import type { IWorkflowActionEngine } from "../contracts/IWorkflowActionEngine";
import type { IWorkflowActionRegistry } from "../contracts/IWorkflowActionRegistry";
import type { IWorkflowPolicyEngine } from "../contracts/IWorkflowPolicyEngine";
import type { IRuntimeEffectGraphBuilder } from "../contracts/IRuntimeEffectGraphBuilder";
import type { IRuntimeEffectPlanner } from "../contracts/IRuntimeEffectPlanner";
import type { IExecutionPlanBuilder } from "../contracts/IExecutionPlanBuilder";
import type { IExecutionPipeline } from "../contracts/IExecutionPipeline";
import type { IExecutionDiagnosticsQueryFacade } from "../contracts/IExecutionDiagnostics";
import type { IWorkflowActionValidator } from "../contracts/IWorkflowActionValidator";
import type { IWorkflowExecutionOrchestrator } from "../contracts/IWorkflowExecutionOrchestrator";
import type { IWorkflowExecutorRegistry } from "../contracts/IWorkflowExecutorRegistry";
import type { IWorkflowValidator } from "../contracts/IWorkflowValidator";
import type { IWorkflowVersionManager } from "../contracts/IWorkflowVersionManager";
import { WorkflowRepository } from "../repositories/WorkflowRepository";
import { createWorkflowFoundation } from "../runtime/WorkflowFoundation";

describe("Workflow interfaces and repository", () => {
  test("workflow foundation composes all frozen interfaces", () => {
    const foundation = createWorkflowFoundation({
      saveDefinition: async () => undefined,
      saveVersion: async () => undefined,
      saveMetadataSnapshot: async () => undefined,
      getMetadataSnapshot: async () => null,
      getDefinitionByEntity: async () => null,
      listVersions: async () => [],
      setVersionStatus: async () => undefined,
      saveManifest: async () => undefined,
      getManifest: async () => null,
      saveValidationReport: async () => undefined,
      savePublishHistory: async () => undefined,
    });

    const engine: IWorkflowEngine = foundation.workflowEngine;
    const repository: IWorkflowRepository = foundation.workflowRepository;
    const manifestGenerator: IWorkflowManifestGenerator = foundation.workflowManifestGenerator;
    const validator: IWorkflowValidator = foundation.workflowValidator;
    const publisher: IWorkflowPublisher = foundation.workflowPublisher;
    const metadataProvider: IWorkflowMetadataProvider = foundation.workflowMetadataProvider;
    const middleware: IWorkflowMiddleware = foundation.workflowMiddleware;
    const versionManager: IWorkflowVersionManager = foundation.workflowVersionManager;
    const simulationService: IWorkflowSimulationService = foundation.workflowSimulationService;
    const stateMachineEngine: IStateMachineEngine = foundation.stateMachineEngine;
    const transitionEngine: ITransitionEngine = foundation.transitionEngine;
    const stateResolver: IStateResolver = foundation.stateResolver;
    const transitionResolver: ITransitionResolver = foundation.transitionResolver;
    const workflowGraphBuilder: IWorkflowGraphBuilder = foundation.workflowGraphBuilder;
    const workflowGraphValidator: IWorkflowGraphValidator = foundation.workflowGraphValidator;
    const participantResolutionEngine: IParticipantResolutionEngine =
      foundation.participantResolutionEngine;
    const workflowActionRegistry: IWorkflowActionRegistry = foundation.workflowActionRegistry;
    const workflowActionEngine: IWorkflowActionEngine = foundation.workflowActionEngine;
    const workflowPolicyEngine: IWorkflowPolicyEngine = foundation.workflowPolicyEngine;
    const runtimeEffectGraphBuilder: IRuntimeEffectGraphBuilder = foundation.runtimeEffectGraphBuilder;
    const runtimeEffectPlanner: IRuntimeEffectPlanner = foundation.runtimeEffectPlanner;
    const executionPlanBuilder: IExecutionPlanBuilder = foundation.executionPlanBuilder;
    const executionPipeline: IExecutionPipeline = foundation.executionPipeline;
    const executionDiagnosticsQueryFacade: IExecutionDiagnosticsQueryFacade =
      foundation.executionDiagnosticsQueryFacade;
    const workflowExecutorRegistry: IWorkflowExecutorRegistry = foundation.workflowExecutorRegistry;
    const workflowActionValidator: IWorkflowActionValidator = foundation.workflowActionValidator;
    const workflowExecutionOrchestrator: IWorkflowExecutionOrchestrator =
      foundation.workflowExecutionOrchestrator;

    expect(engine).toBeDefined();
    expect(repository).toBeDefined();
    expect(manifestGenerator).toBeDefined();
    expect(validator).toBeDefined();
    expect(publisher).toBeDefined();
    expect(metadataProvider).toBeDefined();
    expect(middleware).toBeDefined();
    expect(versionManager).toBeDefined();
    expect(simulationService).toBeDefined();
    expect(stateMachineEngine).toBeDefined();
    expect(transitionEngine).toBeDefined();
    expect(stateResolver).toBeDefined();
    expect(transitionResolver).toBeDefined();
    expect(workflowGraphBuilder).toBeDefined();
    expect(workflowGraphValidator).toBeDefined();
    expect(participantResolutionEngine).toBeDefined();
    expect(workflowActionRegistry).toBeDefined();
    expect(workflowActionEngine).toBeDefined();
    expect(workflowPolicyEngine).toBeDefined();
    expect(runtimeEffectGraphBuilder).toBeDefined();
    expect(runtimeEffectPlanner).toBeDefined();
    expect(executionPlanBuilder).toBeDefined();
    expect(executionPipeline).toBeDefined();
    expect(executionDiagnosticsQueryFacade).toBeDefined();
    expect(workflowExecutorRegistry).toBeDefined();
    expect(workflowActionValidator).toBeDefined();
    expect(workflowExecutionOrchestrator).toBeDefined();
    expect(engine.getParticipantResolutionEngine()).toBe(participantResolutionEngine);
    expect(engine.getActionEngine()).toBe(workflowActionEngine);
    expect(engine.getPolicyEngine()).toBe(workflowPolicyEngine);
    expect(engine.getRuntimeEffectPlanner()).toBe(runtimeEffectPlanner);
    expect(engine.getExecutionOrchestrator()).toBeDefined();
    expect(engine.getExecutionPipeline()).toBeDefined();
    expect(engine.getWorkflowExecutorRegistry()).toBeDefined();
    expect(engine.getExecutionDiagnosticsQueryFacade()).toBeDefined();
  });

  test("repository class is constructible and exposes persistence methods", () => {
    const repository = new WorkflowRepository();

    expect(typeof repository.saveDefinition).toBe("function");
    expect(typeof repository.saveVersion).toBe("function");
    expect(typeof repository.saveMetadataSnapshot).toBe("function");
    expect(typeof repository.getMetadataSnapshot).toBe("function");
    expect(typeof repository.saveManifest).toBe("function");
    expect(typeof repository.saveValidationReport).toBe("function");
  });
});
