import type { IWorkflowRepository } from "../contracts/IWorkflowRepository";
import type {
  WorkflowDefinition,
  WorkflowManifest,
  WorkflowMetadataSnapshot,
  WorkflowPublishResult,
  WorkflowValidationResult,
  WorkflowVersion,
  WorkflowVersionStatus,
} from "../models/WorkflowModels";
import { createWorkflowFoundation } from "../runtime/WorkflowFoundation";
import { buildWorkflowSnapshotWithPolicyScopes } from "./WorkflowTestData";
import { RuntimeContext } from "@/modules/platform/runtime/application";
import { RuntimeTransaction } from "@/modules/platform/runtime/application/models/RuntimeTransaction";
import type { RuntimeOperationResult } from "@/modules/platform/runtime/application/models/RuntimeOperationResult";

jest.setTimeout(120000);

class InMemoryWorkflowRepository implements IWorkflowRepository {
  private readonly definitions = new Map<string, WorkflowDefinition>();
  private readonly metadataSnapshots = new Map<string, WorkflowMetadataSnapshot>();
  private readonly versionsByDefinition = new Map<string, WorkflowVersion[]>();
  private readonly manifestsByVersion = new Map<string, WorkflowManifest>();
  private readonly validationReports = new Map<string, WorkflowValidationResult>();
  private readonly publishHistory: Array<{ workflowVersionId: string; manifestId: string; actorUserId: string }> = [];

  async saveDefinition(definition: WorkflowDefinition): Promise<void> {
    this.definitions.set(definition.id, definition);
  }

  async saveVersion(version: WorkflowVersion): Promise<void> {
    const existing = this.versionsByDefinition.get(version.workflowDefinitionId) ?? [];
    const next = existing.filter((item) => item.id !== version.id);
    next.push(version);
    next.sort((left, right) => left.versionNumber - right.versionNumber || left.id.localeCompare(right.id));
    this.versionsByDefinition.set(version.workflowDefinitionId, next);
  }

  async saveMetadataSnapshot(snapshot: WorkflowMetadataSnapshot): Promise<void> {
    this.metadataSnapshots.set(snapshot.version.id, snapshot);
    await this.saveDefinition(snapshot.definition);
    await this.saveVersion(snapshot.version);
  }

  async getMetadataSnapshot(workflowVersionId: string): Promise<WorkflowMetadataSnapshot | null> {
    return this.metadataSnapshots.get(workflowVersionId) ?? null;
  }

  async getDefinitionByEntity(entityId: string, tenantId: string): Promise<WorkflowDefinition | null> {
    for (const definition of this.definitions.values()) {
      if (definition.entityId === entityId && definition.tenantId === tenantId) {
        return definition;
      }
    }
    return null;
  }

  async listVersions(workflowDefinitionId: string): Promise<WorkflowVersion[]> {
    return [...(this.versionsByDefinition.get(workflowDefinitionId) ?? [])];
  }

  async setVersionStatus(workflowVersionId: string, status: WorkflowVersionStatus, actorUserId: string): Promise<void> {
    for (const [definitionId, versions] of this.versionsByDefinition.entries()) {
      const next = versions.map((version) =>
        version.id === workflowVersionId
          ? { ...version, status, updatedBy: actorUserId, updatedAt: version.updatedAt }
          : version
      );
      this.versionsByDefinition.set(definitionId, next);
    }
  }

  async saveManifest(manifest: WorkflowManifest): Promise<void> {
    this.manifestsByVersion.set(manifest.workflowVersionId, manifest);
  }

  async getManifest(workflowVersionId: string): Promise<WorkflowManifest | null> {
    return this.manifestsByVersion.get(workflowVersionId) ?? null;
  }

  async saveValidationReport(
    workflowVersionId: string,
    validation: WorkflowValidationResult,
    _actorUserId: string
  ): Promise<void> {
    this.validationReports.set(workflowVersionId, validation);
  }

  async savePublishHistory(workflowVersionId: string, manifestId: string, actorUserId: string): Promise<void> {
    this.publishHistory.push({ workflowVersionId, manifestId, actorUserId });
  }

  getPublishHistory(): readonly { workflowVersionId: string; manifestId: string; actorUserId: string }[] {
    return this.publishHistory;
  }
}

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

function buildSnapshot(): WorkflowMetadataSnapshot {
  const snapshot = buildWorkflowSnapshotWithPolicyScopes();
  snapshot.states = snapshot.states.map((state) =>
    state.code === "SUBMITTED"
      ? {
          ...state,
          isTerminal: false,
        }
      : state
  );
  snapshot.actions = snapshot.actions.map((action) =>
    action.code === "SUBMIT_ACTION"
      ? {
          ...action,
          payload: {
            ...(action.payload ?? {}),
            runtimeOperation: "Submit",
            recordId: "record-001",
          },
        }
      : action
  );
  return snapshot;
}

function buildRuntimeContext(snapshot: WorkflowMetadataSnapshot, correlationId: string, transactionId: string) {
  return RuntimeContext.create({
    requestId: `request-${correlationId}`,
    tenantId: snapshot.definition.tenantId,
    organizationId: snapshot.definition.organizationId,
    moduleId: snapshot.definition.moduleId,
    entityId: snapshot.definition.entityId,
    operation: "Submit",
    userId: snapshot.definition.createdBy,
    roles: ["REVIEWER", "AUDITOR"],
    permissions: ["Incident.Edit"],
    correlationId,
    transaction: RuntimeTransaction.create({
      id: transactionId,
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
    }),
    workflowVariables: {},
    workflowAssignments: [],
    entityDefinition: {
      module: "platform",
      entity: snapshot.definition.entityId,
      entityId: snapshot.definition.entityId,
      entityName: "Incident",
      route: "/runtime/platform/incident",
      permissions: {
        view: "Incident.View",
        create: "Incident.Create",
        edit: "Incident.Edit",
        delete: "Incident.Delete",
      },
      numberStrategy: "AUTO",
      searchEnabled: true,
      fields: [],
      presentation: {
        version: "1",
        defaultDataViewId: "",
        defaultDataViewCode: "",
        defaultLayoutViewId: "",
        defaultLayoutViewCode: "",
        dataViews: [],
        layoutViews: [],
        shared: { workflowEnabled: true },
      },
    } as any,
  });
}

async function publishAndHydrate(
  foundation: ReturnType<typeof createWorkflowFoundation>,
  snapshot: WorkflowMetadataSnapshot,
  correlationId: string,
  transactionId: string
) {
  const publishResult: WorkflowPublishResult = await foundation.workflowPublisher.publish(snapshot, "actor-001");
  const workflowManifest = await foundation.workflowMetadataProvider.getManifestForEntity(
    snapshot.definition.entityId,
    snapshot.definition.tenantId
  );

  const runtimeContext = buildRuntimeContext(snapshot, correlationId, transactionId);
  const state = {
    context: runtimeContext,
    transaction: runtimeContext.transaction,
    diagnostics: {
      pipelineTime: 0,
      metadataTime: 0,
      authorizationTime: 0,
      validationTime: 0,
      businessRulesTime: 0,
      workflowTime: 0,
      persistenceTime: 0,
      notificationTime: 0,
      auditTime: 0,
      totalTime: 0,
      middleware: {},
    },
    warnings: [] as string[],
    nonFatalErrors: [] as string[],
    flags: { persistenceSucceeded: false },
  };

  await foundation.workflowMiddleware.execute(state as any, async () => undefined);

  return {
    publishResult,
    workflowManifest,
    state,
  };
}

describe("VS07 Prompt 006D end-to-end integration certification", () => {
  test("certifies complete workflow lifecycle integration", async () => {
    const repository = new InMemoryWorkflowRepository();
    const foundation = createWorkflowFoundation(repository);
    const snapshot = buildSnapshot();

    const { publishResult, workflowManifest, state } = await publishAndHydrate(
      foundation,
      snapshot,
      "corr-006d",
      "txn-006d"
    );

    expect(publishResult.success).toBe(true);
    expect(workflowManifest?.workflowVersionId).toBe(snapshot.version.id);
    expect(state.context.workflowVersionId).toBe(snapshot.version.id);
    expect(state.context.workflowStateCode).toBe("DRAFT");

    const assignment = snapshot.assignments[0];
    const assignmentContext = {
      workflowDefinitionId: snapshot.definition.id,
      workflowVersionId: snapshot.version.id,
      assignment,
      runtimeContext: state.context,
      businessObject: {},
      variables: {},
    };

    const participantResolution = await foundation.participantResolutionEngine.resolve(assignmentContext as any);
    const assignmentPlan = await foundation.assignmentPlanner.buildPlan(
      assignmentContext as any,
      participantResolution.participantSet,
      participantResolution.strategyResult
    );
    const actionPlan = await foundation.workflowActionEngine.resolve({
      snapshot,
      transition: snapshot.transitions[0],
      assignmentPlan,
      runtimeContext: state.context,
    });
    const policyPlan = await foundation.workflowPolicyEngine.resolve({
      snapshot,
      transition: snapshot.transitions[0],
      actionPlan,
    });
    const effectResolution = await foundation.runtimeEffectPlanner.plan(
      snapshot,
      snapshot.transitions[0],
      actionPlan,
      policyPlan
    );
    const manualExecutionPlan = await foundation.executionPlanBuilder.build(
      snapshot.transitions[0],
      actionPlan,
      policyPlan,
      effectResolution
    );

    let capturedTransactionId: string | undefined;
    let capturedCorrelationId: string | undefined;
    const runtimeApplicationEngine = {
      submit: async (ctx: RuntimeContext): Promise<RuntimeOperationResult> => {
        capturedTransactionId = ctx.transaction.id;
        capturedCorrelationId = ctx.correlationId;
        return {
          success: true,
          messages: [],
          warnings: [],
          errors: [],
          validationErrors: [],
          businessRuleErrors: [],
          workflowErrors: [],
          recordId: "record-001",
          affectedRows: 1,
          correlationId: ctx.correlationId,
          executionTime: 0,
          operation: "Submit",
          metadata: {
            transactionId: ctx.transaction.id,
          },
          diagnostics: {
            pipelineTime: 0,
            metadataTime: 0,
            authorizationTime: 0,
            validationTime: 0,
            businessRulesTime: 0,
            workflowTime: 0,
            persistenceTime: 0,
            notificationTime: 0,
            auditTime: 0,
            totalTime: 0,
            middleware: {},
          },
        };
      },
    } as any;

    const executionContext = {
      runtimeContext: state.context,
      workflowDefinitionId: state.context.workflowDefinitionId,
      workflowVersionId: state.context.workflowVersionId,
      workflowInstanceId: state.context.workflowInstanceId,
      workflowState: state.context.workflowStateCode,
      workflowVariables: state.context.workflowVariables,
      workflowAssignments: state.context.workflowAssignments as any,
      assignmentPlan,
      actionPlan,
      policyPlan,
    };

    const result = await foundation.workflowExecutionOrchestrator.orchestrate({
      snapshot,
      transitionCode: snapshot.transitions[0].code,
      context: executionContext as any,
      assignmentPlan,
      executePlan: true,
      runtimeApplicationEngine,
    });

    expect(result.status).toBe("Executed");
    expect(result.executionHash).toBe(manualExecutionPlan.metadata.deterministicHash);
    expect(result.runtimeOperationResults).toHaveLength(1);
    expect(capturedTransactionId).toBe("txn-006d");
    expect(capturedCorrelationId).toBe("corr-006d");

    const diagnostics = foundation.executionDiagnosticsQueryFacade.getByCorrelationId("corr-006d");
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].correlation.transactionId).toBe("txn-006d");
    expect(diagnostics[0].correlation.workflowVersionId).toBe(snapshot.version.id);
    expect(repository.getPublishHistory()).toHaveLength(1);
  });

  test("certifies deterministic integrated planning and publish artifacts", async () => {
    const repository = new InMemoryWorkflowRepository();
    const foundation = createWorkflowFoundation(repository);
    const snapshot = buildSnapshot();

    const firstPublish = await foundation.workflowPublisher.publish(snapshot, "actor-001");
    const secondPublish = await foundation.workflowPublisher.publish(snapshot, "actor-001");
    const manifest = await foundation.workflowMetadataProvider.getManifestForEntity(
      snapshot.definition.entityId,
      snapshot.definition.tenantId
    );

    const runtimeContext = buildRuntimeContext(snapshot, "corr-det", "txn-det");
    const assignmentContext = {
      workflowDefinitionId: snapshot.definition.id,
      workflowVersionId: snapshot.version.id,
      assignment: snapshot.assignments[0],
      runtimeContext,
      businessObject: {},
      variables: {},
    };

    const participantResolutionA = await foundation.participantResolutionEngine.resolve(assignmentContext as any);
    const participantResolutionB = await foundation.participantResolutionEngine.resolve(assignmentContext as any);

    expect(firstPublish.manifestId).toBe(secondPublish.manifestId);
    expect(stableStringify(manifest)).toBe(stableStringify(await repository.getManifest(snapshot.version.id)));
    expect(participantResolutionA).toEqual(participantResolutionB);
  });

  test("certifies concurrent orchestration, transaction isolation, and correlation isolation", async () => {
    const repository = new InMemoryWorkflowRepository();
    const foundation = createWorkflowFoundation(repository);
    const snapshot = buildSnapshot();
    await foundation.workflowPublisher.publish(snapshot, "actor-001");

    const seenTransactionIds = new Set<string>();
    const seenCorrelationIds = new Set<string>();

    const runtimeApplicationEngine = {
      submit: async (ctx: RuntimeContext): Promise<RuntimeOperationResult> => {
        seenTransactionIds.add(ctx.transaction.id);
        seenCorrelationIds.add(ctx.correlationId);
        return {
          success: true,
          messages: [],
          warnings: [],
          errors: [],
          validationErrors: [],
          businessRuleErrors: [],
          workflowErrors: [],
          recordId: ctx.recordId ?? "record-001",
          affectedRows: 1,
          correlationId: ctx.correlationId,
          executionTime: 0,
          operation: "Submit",
          metadata: {},
          diagnostics: {
            pipelineTime: 0,
            metadataTime: 0,
            authorizationTime: 0,
            validationTime: 0,
            businessRulesTime: 0,
            workflowTime: 0,
            persistenceTime: 0,
            notificationTime: 0,
            auditTime: 0,
            totalTime: 0,
            middleware: {},
          },
        };
      },
    } as any;

    const results = await Promise.all(
      Array.from({ length: 50 }, async (_, index) => {
        const correlationId = `corr-${index}`;
        const transactionId = `txn-${index}`;
        const { state } = await publishAndHydrate(foundation, snapshot, correlationId, transactionId);
        const assignmentContext = {
          workflowDefinitionId: snapshot.definition.id,
          workflowVersionId: snapshot.version.id,
          assignment: snapshot.assignments[0],
          runtimeContext: state.context,
          businessObject: {},
          variables: {},
        };
        const participantResolution = await foundation.participantResolutionEngine.resolve(assignmentContext as any);
        const assignmentPlan = await foundation.assignmentPlanner.buildPlan(
          assignmentContext as any,
          participantResolution.participantSet,
          participantResolution.strategyResult
        );

        return foundation.workflowExecutionOrchestrator.orchestrate({
          snapshot,
          transitionCode: snapshot.transitions[0].code,
          context: {
            runtimeContext: state.context,
            workflowDefinitionId: state.context.workflowDefinitionId,
            workflowVersionId: state.context.workflowVersionId,
            workflowState: state.context.workflowStateCode,
            workflowInstanceId: state.context.workflowInstanceId,
            workflowVariables: state.context.workflowVariables,
            workflowAssignments: state.context.workflowAssignments as any,
            assignmentPlan,
          } as any,
          assignmentPlan,
          executePlan: true,
          runtimeApplicationEngine,
        });
      })
    );

    expect(results.every((item) => item.status === "Executed")).toBe(true);
    expect(seenTransactionIds.size).toBe(50);
    expect(seenCorrelationIds.size).toBe(50);
  });

  test("certifies isolated failure handling for missing providers and runtime adapter failures", async () => {
    const repository = new InMemoryWorkflowRepository();
    const foundation = createWorkflowFoundation(repository);
    const snapshot = buildSnapshot();
    await foundation.workflowPublisher.publish(snapshot, "actor-001");

    const missingProviderAssignment = {
      ...snapshot.assignments[0],
      participantType: "CustomProvider",
      assignmentType: "ExternalProvider",
    } as any;

    const runtimeContext = buildRuntimeContext(snapshot, "corr-fail", "txn-fail");
    await expect(
      foundation.participantResolutionEngine.resolve({
        workflowDefinitionId: snapshot.definition.id,
        workflowVersionId: snapshot.version.id,
        assignment: missingProviderAssignment,
        runtimeContext,
        businessObject: {},
        variables: {},
      } as any)
    ).rejects.toThrow("No participant provider registered");

    const { state } = await publishAndHydrate(foundation, snapshot, "corr-runtime-fail", "txn-runtime-fail");
    const assignmentContext = {
      workflowDefinitionId: snapshot.definition.id,
      workflowVersionId: snapshot.version.id,
      assignment: snapshot.assignments[0],
      runtimeContext: state.context,
      businessObject: {},
      variables: {},
    };
    const participantResolution = await foundation.participantResolutionEngine.resolve(assignmentContext as any);
    const assignmentPlan = await foundation.assignmentPlanner.buildPlan(
      assignmentContext as any,
      participantResolution.participantSet,
      participantResolution.strategyResult
    );

    await expect(
      foundation.workflowExecutionOrchestrator.orchestrate({
        snapshot,
        transitionCode: snapshot.transitions[0].code,
        context: {
          runtimeContext: state.context,
          workflowDefinitionId: state.context.workflowDefinitionId,
          workflowVersionId: state.context.workflowVersionId,
          workflowState: state.context.workflowStateCode,
          workflowVariables: state.context.workflowVariables,
          workflowAssignments: state.context.workflowAssignments as any,
          assignmentPlan,
        } as any,
        assignmentPlan,
        executePlan: true,
        runtimeApplicationEngine: {
          submit: async () => {
            throw new Error("Runtime adapter failure");
          },
        } as any,
      })
    ).rejects.toThrow("Runtime adapter failure");
  });

  test("certifies end-to-end performance target", async () => {
    const repository = new InMemoryWorkflowRepository();
    const foundation = createWorkflowFoundation(repository);
    const snapshot = buildSnapshot();

    const runtimeApplicationEngine = {
      submit: async (ctx: RuntimeContext): Promise<RuntimeOperationResult> => ({
        success: true,
        messages: [],
        warnings: [],
        errors: [],
        validationErrors: [],
        businessRuleErrors: [],
        workflowErrors: [],
        recordId: "record-001",
        affectedRows: 1,
        correlationId: ctx.correlationId,
        executionTime: 0,
        operation: "Submit",
        metadata: {},
        diagnostics: {
          pipelineTime: 0,
          metadataTime: 0,
          authorizationTime: 0,
          validationTime: 0,
          businessRulesTime: 0,
          workflowTime: 0,
          persistenceTime: 0,
          notificationTime: 0,
          auditTime: 0,
          totalTime: 0,
          middleware: {},
        },
      }),
    } as any;

    const averageMs = await benchmarkAverageMs(40, async () => {
      const { state } = await publishAndHydrate(foundation, buildSnapshot(), "corr-perf", "txn-perf");
      const assignmentContext = {
        workflowDefinitionId: snapshot.definition.id,
        workflowVersionId: snapshot.version.id,
        assignment: snapshot.assignments[0],
        runtimeContext: state.context,
        businessObject: {},
        variables: {},
      };
      const participantResolution = await foundation.participantResolutionEngine.resolve(assignmentContext as any);
      const assignmentPlan = await foundation.assignmentPlanner.buildPlan(
        assignmentContext as any,
        participantResolution.participantSet,
        participantResolution.strategyResult
      );
      await foundation.workflowExecutionOrchestrator.orchestrate({
        snapshot,
        transitionCode: snapshot.transitions[0].code,
        context: {
          runtimeContext: state.context,
          workflowDefinitionId: state.context.workflowDefinitionId,
          workflowVersionId: state.context.workflowVersionId,
          workflowState: state.context.workflowStateCode,
          workflowVariables: state.context.workflowVariables,
          workflowAssignments: state.context.workflowAssignments as any,
          assignmentPlan,
        } as any,
        assignmentPlan,
        executePlan: true,
        runtimeApplicationEngine,
      });
    });

    console.info("CERT_P006D", JSON.stringify({ averageMs }));
    expect(averageMs).toBeLessThan(250);
  });
});
