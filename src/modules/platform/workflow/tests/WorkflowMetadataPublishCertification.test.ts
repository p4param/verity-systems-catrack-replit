import { WorkflowManifestGenerator } from "../services/WorkflowManifestGenerator";
import { WorkflowPublisher } from "../services/WorkflowPublisher";
import { RuntimeExpressionAdapter } from "../services/RuntimeExpressionAdapter";
import { WorkflowValidator } from "../services/WorkflowValidator";
import { WorkflowMetadataNormalizer } from "../services/WorkflowMetadataNormalizer";
import { WorkflowMetadataOptimizer } from "../services/WorkflowMetadataOptimizer";
import { WorkflowActionValidator } from "../services/WorkflowActionValidator";
import { ParticipantValidator } from "../services/ParticipantValidator";
import { ParticipantRegistry } from "../services/ParticipantRegistry";
import { WorkflowActionRegistry } from "../services/WorkflowActionRegistry";
import { WorkflowActionPolicySchemas } from "../services/WorkflowActionPolicySchemas";
import { WorkflowPolicyEngine } from "../services/WorkflowPolicyEngine";
import { PlatformActionProvider } from "../services/action-providers";
import { GenericPolicyProvider } from "../services/policy-providers";
import { RoleParticipantProvider } from "../services/participant-providers";
import type { IWorkflowRepository } from "../contracts/IWorkflowRepository";
import type { WorkflowMetadataSnapshot, WorkflowManifest, WorkflowValidationResult } from "../models/WorkflowModels";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

jest.setTimeout(120000);

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

function benchmarkAverageMs(iterations: number, fn: () => Promise<void> | void): Promise<number> {
  return (async () => {
    const startedAt = process.hrtime.bigint();
    for (let index = 0; index < iterations; index += 1) {
      await fn();
    }
    return Number(process.hrtime.bigint() - startedAt) / 1_000_000 / iterations;
  })();
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

function buildPublisher(repository: jest.Mocked<IWorkflowRepository>) {
  const actionRegistry = new WorkflowActionRegistry();
  actionRegistry.register(new PlatformActionProvider());
  const policyProviders = [new GenericPolicyProvider()];
  const participantRegistry = new ParticipantRegistry();
  participantRegistry.register(new RoleParticipantProvider());

  return new WorkflowPublisher(
    repository,
    new WorkflowValidator(new RuntimeExpressionAdapter()),
    new WorkflowManifestGenerator(),
    new WorkflowMetadataNormalizer(),
    new WorkflowMetadataOptimizer(),
    new ParticipantValidator(participantRegistry, {
      hasCircularHierarchy: async () => false,
    } as any),
    new WorkflowActionValidator(actionRegistry, policyProviders, new WorkflowActionPolicySchemas())
  );
}

describe("VS07 Prompt 006A metadata and publish certification", () => {
  test("certifies metadata validation coverage", async () => {
    const validator = new WorkflowValidator(new RuntimeExpressionAdapter());

    const missingTerminal = buildWorkflowSnapshot();
    missingTerminal.states = missingTerminal.states.map((state) => ({ ...state, isTerminal: false }));
    const missingTerminalResult = await validator.validate(missingTerminal);
    expect(missingTerminalResult.errors.some((item) => item.code === "WF_MISSING_TERMINAL_STATE")).toBe(true);

    const duplicateVariables = buildWorkflowSnapshot();
    duplicateVariables.variables = [...duplicateVariables.variables, { ...duplicateVariables.variables[0], id: crypto.randomUUID() }];
    const duplicateVariableResult = await validator.validate(duplicateVariables);
    expect(duplicateVariableResult.errors.some((item) => item.code === "WF_DUPLICATE_VARIABLE")).toBe(true);

    const duplicateTransitions = buildWorkflowSnapshot();
    duplicateTransitions.transitions = [...duplicateTransitions.transitions, { ...duplicateTransitions.transitions[0], id: crypto.randomUUID() }];
    const duplicateTransitionResult = await validator.validate(duplicateTransitions);
    expect(duplicateTransitionResult.errors.some((item) => item.code === "WF_DUPLICATE_TRANSITION_CODE")).toBe(true);
  });

  test("certifies publish pipeline stage order and single execution", async () => {
    const snapshot = buildWorkflowSnapshot();
    const repository = repositoryMock();
    const validation: WorkflowValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      validatedAt: snapshot.version.updatedAt,
    };
    const manifest: WorkflowManifest = {
      id: snapshot.version.id,
      workflowDefinitionId: snapshot.definition.id,
      workflowVersionId: snapshot.version.id,
      generatedAt: snapshot.version.updatedAt,
      generatedBy: "actor-001",
      runtimeModel: {} as any,
      participantManifest: {} as any,
      assignmentManifest: {} as any,
      resolutionManifest: {} as any,
      actionManifest: {} as any,
      policyManifest: {} as any,
      runtimeEffectManifest: {} as any,
      executionManifest: {} as any,
      validation,
      designerSnapshot: snapshot,
    };

    const calls: string[] = [];
    const publisher = new WorkflowPublisher(
      repository,
      { validate: jest.fn(async (input: WorkflowMetadataSnapshot) => { calls.push(`validate:${input.version.id}`); return validation; }) },
      { generate: jest.fn(async () => { calls.push("generate"); return manifest; }) },
      { normalize: jest.fn(async (input: WorkflowMetadataSnapshot) => { calls.push("normalize"); return input; }) },
      { optimize: jest.fn(async (input: WorkflowMetadataSnapshot) => { calls.push("optimize"); return input; }) },
      null,
      null
    );

    repository.getManifest.mockImplementation(async () => {
      calls.push("getManifest");
      return null;
    });
    repository.listVersions.mockImplementation(async () => {
      calls.push("listVersions");
      return [];
    });
    repository.saveValidationReport.mockImplementation(async () => {
      calls.push("saveValidationReport");
    });
    repository.saveDefinition.mockImplementation(async () => {
      calls.push("saveDefinition");
    });
    repository.saveVersion.mockImplementation(async () => {
      calls.push("saveVersion");
    });
    repository.saveMetadataSnapshot.mockImplementation(async () => {
      calls.push("saveMetadataSnapshot");
    });
    repository.saveManifest.mockImplementation(async () => {
      calls.push("saveManifest");
    });
    repository.savePublishHistory.mockImplementation(async () => {
      calls.push("savePublishHistory");
    });

    const result = await publisher.publish(snapshot, "actor-001");

    expect(result.success).toBe(true);
    expect(calls).toEqual([
      "normalize",
      "optimize",
      `validate:${snapshot.version.id}`,
      "listVersions",
      "getManifest",
      "saveValidationReport",
      "saveDefinition",
      "saveVersion",
      "saveMetadataSnapshot",
      "generate",
      "saveManifest",
      "savePublishHistory",
    ]);
  });

  test("certifies manifest determinism and stable serialization", async () => {
    const snapshot = buildWorkflowSnapshot();
    const validator = new WorkflowValidator(new RuntimeExpressionAdapter());
    const validation = await validator.validate(snapshot);
    const generator = new WorkflowManifestGenerator();

    const first = await generator.generate(snapshot, validation, "actor-001");
    const second = await generator.generate(snapshot, validation, "actor-001");

    expect(first.id).toBe(second.id);
    expect(first.generatedAt).toEqual(second.generatedAt);
    expect(stableStringify(first)).toBe(stableStringify(second));
  });

  test("certifies idempotent publish and immutable published versions", async () => {
    const repository = repositoryMock();
    const publisher = buildPublisher(repository);
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

    const changedSnapshot: WorkflowMetadataSnapshot = {
      ...snapshot,
      definition: {
        ...snapshot.definition,
        name: `${snapshot.definition.name} v2`,
      },
    };

    const changedResult = await publisher.publish(changedSnapshot, "actor-001");
    expect(changedResult.success).toBe(false);
    expect(changedResult.validation.errors.some((item) => item.code === "WF_PUBLISHED_VERSION_IMMUTABLE")).toBe(true);
  });

  test("certifies performance targets for validation, manifest generation, serialization, and publish", async () => {
    const snapshot = buildWorkflowSnapshot();
    const validator = new WorkflowValidator(new RuntimeExpressionAdapter());
    const generator = new WorkflowManifestGenerator();
    const repository = repositoryMock();
    const publisher = buildPublisher(repository);

    const validationMs = await benchmarkAverageMs(200, async () => {
      await validator.validate(snapshot);
    });

    const validation = await validator.validate(snapshot);
    const manifestMs = await benchmarkAverageMs(100, async () => {
      await generator.generate(snapshot, validation, "actor-001");
    });

    const manifest = await generator.generate(snapshot, validation, "actor-001");
    const serializationMs = await benchmarkAverageMs(300, () => {
      stableStringify(manifest);
    });

    repository.getManifest.mockResolvedValue(null);
    const publishMs = await benchmarkAverageMs(80, async () => {
      await publisher.publish(buildWorkflowSnapshot(), "actor-001");
    });

    console.info(
      "CERT_P006A",
      JSON.stringify({ validationMs, manifestMs, serializationMs, publishMs })
    );

    expect(validationMs).toBeLessThan(20);
    expect(manifestMs).toBeLessThan(50);
    expect(serializationMs).toBeLessThan(10);
    expect(publishMs).toBeLessThan(100);
  });
});
