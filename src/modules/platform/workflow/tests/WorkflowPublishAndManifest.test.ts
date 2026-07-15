import { WorkflowManifestGenerator } from "../services/WorkflowManifestGenerator";
import { WorkflowPublisher } from "../services/WorkflowPublisher";
import { RuntimeExpressionAdapter } from "../services/RuntimeExpressionAdapter";
import { WorkflowValidator } from "../services/WorkflowValidator";
import type { IWorkflowRepository } from "../contracts/IWorkflowRepository";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort((left, right) => left.localeCompare(right));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

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
    expect(manifest.actionManifest.transitions.length).toBeGreaterThan(0);
    expect(manifest.policyManifest.transitions.length).toBeGreaterThanOrEqual(0);
    expect(manifest.runtimeEffectManifest.transitions.length).toBeGreaterThan(0);
    expect(manifest.executionManifest.transitions.length).toBeGreaterThan(0);
  });

  test("generates deterministic workflow manifest for identical metadata", async () => {
    const generator = new WorkflowManifestGenerator();
    const snapshot = buildWorkflowSnapshot();
    const validator = new WorkflowValidator(new RuntimeExpressionAdapter());
    const validation = await validator.validate(snapshot);

    const first = await generator.generate(snapshot, validation, "actor-001");
    const second = await generator.generate(snapshot, validation, "actor-001");

    expect(first.id).toBe(second.id);
    expect(first.generatedAt).toEqual(second.generatedAt);
    expect(stableStringify(first)).toBe(stableStringify(second));
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

  test("reuses existing manifest when publishing identical metadata", async () => {
    const repository = repositoryMock();
    const validator = new WorkflowValidator(new RuntimeExpressionAdapter());
    const publisher = new WorkflowPublisher(repository, validator, new WorkflowManifestGenerator());
    const snapshot = buildWorkflowSnapshot();
    const first = await publisher.publish(snapshot, "actor-001");

    repository.getManifest.mockResolvedValue({
      id: first.manifestId!,
      workflowDefinitionId: snapshot.definition.id,
      workflowVersionId: snapshot.version.id,
      generatedAt: first.publishedAt,
      generatedBy: "actor-001",
      runtimeModel: {} as any,
      participantManifest: {} as any,
      assignmentManifest: {} as any,
      resolutionManifest: {} as any,
      actionManifest: {} as any,
      policyManifest: {} as any,
      runtimeEffectManifest: {} as any,
      executionManifest: {} as any,
      validation: first.validation,
      designerSnapshot: snapshot,
    });

    const second = await publisher.publish(snapshot, "actor-001");

    expect(second.success).toBe(true);
    expect(second.manifestId).toBe(first.manifestId);
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
