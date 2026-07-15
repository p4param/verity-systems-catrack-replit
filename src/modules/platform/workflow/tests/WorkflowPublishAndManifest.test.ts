import { WorkflowManifestGenerator } from "../services/WorkflowManifestGenerator";
import { WorkflowPublisher } from "../services/WorkflowPublisher";
import { RuntimeExpressionAdapter } from "../services/RuntimeExpressionAdapter";
import { WorkflowValidator } from "../services/WorkflowValidator";
import type { IWorkflowRepository } from "../contracts/IWorkflowRepository";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

function repositoryMock(): jest.Mocked<IWorkflowRepository> {
  return {
    saveDefinition: jest.fn(async () => undefined),
    saveVersion: jest.fn(async () => undefined),
    saveMetadataSnapshot: jest.fn(async () => undefined),
    getMetadataSnapshot: jest.fn(async () => null),
    getDefinitionByEntity: jest.fn(async () => null),
    listVersions: jest.fn(async () => []),
    setVersionStatus: jest.fn(async () => undefined),
    saveManifest: jest.fn(async () => undefined),
    getManifest: jest.fn(async () => null),
    saveValidationReport: jest.fn(async () => undefined),
    savePublishHistory: jest.fn(async () => undefined),
  };
}

describe("Workflow publish and manifest", () => {
  test("generates workflow manifest", async () => {
    const generator = new WorkflowManifestGenerator();
    const snapshot = buildWorkflowSnapshot();
    const validator = new WorkflowValidator(new RuntimeExpressionAdapter());
    const validation = await validator.validate(snapshot);

    const manifest = await generator.generate(snapshot, validation, crypto.randomUUID());

    expect(manifest.workflowDefinitionId).toBe(snapshot.definition.id);
    expect(manifest.workflowVersionId).toBe(snapshot.version.id);
    expect(manifest.validation.isValid).toBe(true);
  });

  test("publishes validated workflow snapshot", async () => {
    const repository = repositoryMock();
    const validator = new WorkflowValidator(new RuntimeExpressionAdapter());
    const publisher = new WorkflowPublisher(repository, validator, new WorkflowManifestGenerator());

    const result = await publisher.publish(buildWorkflowSnapshot(), crypto.randomUUID());

    expect(result.success).toBe(true);
    expect(repository.saveManifest).toHaveBeenCalledTimes(1);
    expect(repository.savePublishHistory).toHaveBeenCalledTimes(1);
  });

  test("blocks publish when duplicate version exists", async () => {
    const repository = repositoryMock();
    const snapshot = buildWorkflowSnapshot();
    repository.listVersions.mockResolvedValue([
      {
        ...snapshot.version,
        id: crypto.randomUUID(),
      },
    ]);

    const validator = new WorkflowValidator(new RuntimeExpressionAdapter());
    const publisher = new WorkflowPublisher(repository, validator, new WorkflowManifestGenerator());

    const result = await publisher.publish(snapshot, crypto.randomUUID());

    expect(result.success).toBe(false);
    expect(result.validation.errors.some((item) => item.code === "WF_DUPLICATE_VERSION")).toBe(true);
  });
});
