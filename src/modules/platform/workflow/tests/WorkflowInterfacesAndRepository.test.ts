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
