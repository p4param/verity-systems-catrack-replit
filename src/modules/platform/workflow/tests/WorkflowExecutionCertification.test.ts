import { readFileSync } from "fs";
import { resolve } from "path";
import type { IExecutionContext } from "../contracts/IExecutionContext";
import type { IExecutionResult } from "../contracts/IExecutionResult";
import type {
  ExecutionCorrelation,
  IExecutionDiagnostics,
  IExecutionDiagnosticsCollector,
  IExecutionObserver,
} from "../contracts/IExecutionDiagnostics";
import type { RuntimeOperationRequest } from "../contracts/IRuntimeOperationRequest";
import type { IWorkflowExecutor } from "../contracts/IWorkflowExecutor";
import type { RuntimeOperationResult } from "@/modules/platform/runtime/application/models/RuntimeOperationResult";
import { ExecutionDiagnosticsCollector } from "../services/ExecutionDiagnosticsCollector";
import { ExecutionDiagnosticsSerializer } from "../services/ExecutionDiagnosticsSerializer";
import { ExecutionDispatchStage } from "../services/ExecutionDispatchStage";
import { ExecutionMapper } from "../services/ExecutionMapper";
import { ExecutionPipeline } from "../services/ExecutionPipeline";
import { ExecutionPlanningStage } from "../services/ExecutionPlanningStage";
import { InMemoryExecutionDiagnosticsQueryFacade } from "../services/InMemoryExecutionDiagnosticsQueryFacade";
import { RuntimeApplicationExecutor } from "../services/RuntimeApplicationExecutor";
import { WorkflowExecutorRegistry } from "../services/WorkflowExecutorRegistry";
import { WorkflowExecutionOrchestrator } from "../services/WorkflowExecutionOrchestrator";
import { WorkflowActionRegistry } from "../services/WorkflowActionRegistry";
import { WorkflowActionEngine } from "../services/WorkflowActionEngine";
import { WorkflowPolicyEngine } from "../services/WorkflowPolicyEngine";
import { RuntimeEffectPlanner } from "../services/RuntimeEffectPlanner";
import { RuntimeEffectGraphBuilder } from "../services/RuntimeEffectGraphBuilder";
import { ExecutionPlanBuilder } from "../services/ExecutionPlanBuilder";
import { PlatformActionProvider } from "../services/action-providers";
import { GenericPolicyProvider } from "../services/policy-providers";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

jest.setTimeout(240000);

const TARGETS = {
  pipelineDispatchMs: 5,
  mapperMs: 2,
  adapterMs: 5,
  diagnosticsOverheadPercent: 5,
  serializationMs: 10,
  queryMs: 2,
} as const;

function nowMs(): bigint {
  return process.hrtime.bigint();
}

function elapsedMs(startedAt: bigint): number {
  return Number(nowMs() - startedAt) / 1_000_000;
}

async function benchmarkAverageMs(iterations: number, fn: () => Promise<void> | void): Promise<number> {
  for (let index = 0; index < Math.min(25, iterations); index += 1) {
    await fn();
  }

  const startedAt = nowMs();
  for (let index = 0; index < iterations; index += 1) {
    await fn();
  }

  return elapsedMs(startedAt) / iterations;
}

function runtimeContext(correlationId: string) {
  return {
    correlationId,
    requestId: `request-${correlationId}`,
    moduleId: "platform",
    entityId: "department",
    operation: "Submit",
    with(this: any, patch: Record<string, unknown>) {
      return {
        ...this,
        ...patch,
        with: this.with,
      };
    },
  } as any;
}

function buildCorrelation(executionId: string, correlationId: string): ExecutionCorrelation {
  return {
    executionId,
    correlationId,
    workflowDefinitionId: "definition-001",
    workflowVersionId: "version-001",
    workflowInstanceId: `instance-${executionId}`,
    executionHash: `hash-${executionId}`,
    runtimeOperationId: "SUBMIT",
    transactionId: `txn-${executionId}`,
    publishVersion: "version-001",
  };
}

function buildNoopCollector(): IExecutionDiagnosticsCollector {
  return {
    begin(): IExecutionObserver {
      return {
        recordTrace: () => undefined,
        recordMetric: () => undefined,
        recordWarning: () => undefined,
        recordError: () => undefined,
        snapshot: () => ({
          correlation: buildCorrelation("noop", "noop"),
          trace: [],
          timeline: { startedAt: new Date(), records: [] },
          metrics: {
            samples: [],
            pipelineDuration: 0,
            stageDuration: {},
            executorDuration: {},
            runtimeDuration: 0,
            totalExecutionTime: 0,
            planningTime: 0,
            dispatchTime: 0,
            deferredCount: 0,
            executedCount: 0,
            skippedCount: 0,
            failedCount: 0,
            retryCount: 0,
          },
          counters: {
            executedCount: 0,
            deferredCount: 0,
            skippedCount: 0,
            failedCount: 0,
            retryCount: 0,
            stageCount: 0,
            runtimeOperationCount: 0,
          },
          warnings: { messages: [] },
          errors: { messages: [] },
          summary: {
            executionId: "noop",
            correlationId: "noop",
            executionHash: "hash-noop",
            status: "Planned",
            stageCount: 0,
            runtimeOperationCount: 0,
            executedCount: 0,
            deferredCount: 0,
            skippedCount: 0,
            failedCount: 0,
            warnings: 0,
            errors: 0,
          },
          performance: {
            planningTime: 0,
            pipelineDuration: 0,
            dispatchTime: 0,
            runtimeDuration: 0,
            totalExecutionTime: 0,
          },
          diagnostics: {},
        } satisfies IExecutionDiagnostics),
      };
    },
    validate: () => undefined,
  };
}

class ExecutedTestExecutor implements IWorkflowExecutor {
  readonly executorKey = "certification.executor";
  readonly supportedEffectTypes = ["StateChange"] as const;
  readonly capabilities = {
    SupportsTransactions: true,
    SupportsRollback: true,
    SupportsRetry: true,
    SupportsCompensation: true,
    SupportsAsync: true,
    SupportsIdempotency: true,
    SupportsDiagnostics: true,
    SupportsSimulation: true,
  };
  readonly executionPriority = 100;

  async execute(request: RuntimeOperationRequest) {
    return {
      status: "Executed" as const,
      request,
    };
  }
}

class ThrowingExecutor extends ExecutedTestExecutor {
  override async execute(): Promise<never> {
    throw new Error("Runtime executor failure.");
  }
}

async function buildExecutionPlan() {
  const snapshot = buildWorkflowSnapshot();
  const transition = snapshot.transitions[0];
  const actionRegistry = new WorkflowActionRegistry();
  actionRegistry.register(new PlatformActionProvider());

  const actionPlan = await new WorkflowActionEngine(actionRegistry).resolve({
    snapshot,
    transition,
    assignmentPlan: undefined,
    runtimeContext: runtimeContext("plan-build"),
  });

  const policyPlan = await new WorkflowPolicyEngine([new GenericPolicyProvider()]).resolve({
    snapshot,
    transition,
    actionPlan,
  });

  const effectResolution = await new RuntimeEffectPlanner(new RuntimeEffectGraphBuilder()).plan(
    snapshot,
    transition,
    actionPlan,
    policyPlan
  );

  const plan = await new ExecutionPlanBuilder().build(transition, actionPlan, policyPlan, effectResolution);
  plan.runtimeEffectSet.effects[0] = {
    ...plan.runtimeEffectSet.effects[0],
    metadata: {
      ...(plan.runtimeEffectSet.effects[0].metadata ?? {}),
      runtimeOperation: "Submit",
      payload: { recordId: "record-001" },
    },
  };

  return plan;
}

function expandPlan(plan: Awaited<ReturnType<typeof buildExecutionPlan>>, effectCount: number) {
  const base = plan.runtimeEffectSet.effects[0];
  const effects = Array.from({ length: effectCount }, (_, index) => ({
    ...base,
    effectCode: `effect-${index + 1}`,
  }));

  return {
    ...plan,
    runtimeEffectSet: {
      ...plan.runtimeEffectSet,
      effects,
    },
    orderedEffectCodes: effects.map((item) => item.effectCode),
  };
}

function buildPipeline(registry: WorkflowExecutorRegistry): ExecutionPipeline {
  const pipeline = new ExecutionPipeline();
  pipeline.registerStage(new ExecutionPlanningStage());
  pipeline.registerStage(new ExecutionDispatchStage(new ExecutionMapper(), registry));
  return pipeline;
}

function buildContext(
  plan: Awaited<ReturnType<typeof buildExecutionPlan>>,
  correlationId: string,
  observer?: IExecutionObserver
): IExecutionContext {
  const contextRuntime = runtimeContext(correlationId);

  return {
    workflowContext: {
      runtimeContext: contextRuntime,
      workflowVariables: {},
      workflowAssignments: [],
    },
    executionPlan: plan,
    assignmentPlan: undefined,
    actionPlan: plan.actionPlan,
    policyPlan: plan.policyPlan,
    runtimeContext: contextRuntime,
    runtimeTransaction: { id: `txn-${correlationId}` } as any,
    runtimeApplicationEngine: undefined,
    executionRequested: true,
    executionHash: plan.metadata.deterministicHash,
    correlationId,
    diagnostics: {},
    observer,
    executionMetadata: plan.metadata,
    metadata: {
      workflowVersionId: plan.workflowVersionId,
      transitionCode: plan.transitionCode,
    },
  };
}

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("VS07 Prompt 005D execution certification", () => {
  test("certifies performance targets", async () => {
    const plan = await buildExecutionPlan();
    const registry = new WorkflowExecutorRegistry();
    registry.register(new ExecutedTestExecutor());
    const pipeline = buildPipeline(registry);
    const mapper = new ExecutionMapper();
    const serializer = new ExecutionDiagnosticsSerializer();
    const queryFacade = new InMemoryExecutionDiagnosticsQueryFacade(2048);

    const adapter = new RuntimeApplicationExecutor({
      submit: async (ctx: any) => ({
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
        metadata: { transactionId: ctx.transaction?.id },
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
      }) as RuntimeOperationResult,
    } as any);

    const baseContext = buildContext(plan, "perf-base");
    const mapperMs = await benchmarkAverageMs(400, () => {
      mapper.map(plan, baseContext);
    });

    const pipelineMs = await benchmarkAverageMs(250, async () => {
      await pipeline.execute(buildContext(plan, "perf-pipeline"));
    });

    const request: RuntimeOperationRequest = {
      executionPlanId: plan.id,
      executionHash: plan.metadata.deterministicHash,
      correlationId: "perf-adapter",
      effectCode: "effect-adapter",
      effectType: "StateChange",
      operation: "Submit",
      runtimeContext: runtimeContext("perf-adapter"),
      runtimeTransaction: { id: "txn-perf" } as any,
      payload: { recordId: "record-001" },
      metadata: {},
    };

    const adapterMs = await benchmarkAverageMs(300, async () => {
      await adapter.execute(request);
    });

    const collector = new ExecutionDiagnosticsCollector({
      samplingPolicy: {
        traceSampleRate: 0,
        metricSampleRate: 0,
      },
    });
    const noopCollector = buildNoopCollector();

    const snapshot = buildWorkflowSnapshot();
    const actionRegistry = new WorkflowActionRegistry();
    actionRegistry.register(new PlatformActionProvider());

    const overheadOrchestrator = new WorkflowExecutionOrchestrator(
      new WorkflowActionEngine(actionRegistry),
      new WorkflowPolicyEngine([new GenericPolicyProvider()]),
      new RuntimeEffectPlanner(new RuntimeEffectGraphBuilder()),
      new ExecutionPlanBuilder(),
      {
        registerStage: () => undefined,
        getStages: () => [],
        execute: async (context: IExecutionContext): Promise<IExecutionResult> => ({
          success: true,
          status: "Planned",
          executionPlanId: context.executionPlan.id,
          executionHash: context.executionHash,
          correlationId: context.correlationId,
          executedEffectCodes: [],
          deferredEffectCodes: [...context.executionPlan.orderedEffectCodes],
          skippedEffectCodes: [],
          failedEffectCodes: [],
          warnings: [],
          runtimeOperationResults: [],
          stageResults: [],
          executionTime: 0,
          diagnostics: {},
        }),
      }
    );

    const withoutDiagnosticsMs = await benchmarkAverageMs(80, async () => {
      await overheadOrchestrator.orchestrate({
        snapshot,
        transitionCode: "SUBMIT",
        diagnosticsCollector: noopCollector,
        context: {
          runtimeContext: runtimeContext("perf-noop"),
          workflowVariables: {},
          workflowAssignments: [],
        },
      });
    });

    const withDiagnosticsMs = await benchmarkAverageMs(80, async () => {
      await overheadOrchestrator.orchestrate({
        snapshot,
        transitionCode: "SUBMIT",
        diagnosticsCollector: collector,
        context: {
          runtimeContext: runtimeContext("perf-diag"),
          workflowVariables: {},
          workflowAssignments: [],
        },
      });
    });

    const diagnosticsOverheadPercent =
      ((withDiagnosticsMs - withoutDiagnosticsMs) / Math.max(withoutDiagnosticsMs, 0.001)) * 100;

    const snapshotObserver = collector
      .begin(buildCorrelation("perf-serialization", "perf-serialization"));
    snapshotObserver.recordTrace({
      traceId: "trace-001",
      timestamp: new Date("2026-01-01T00:00:00.000Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionStarted",
      duration: 0,
      status: "Started",
      correlationId: "perf-serialization",
      diagnostics: {},
    });
    snapshotObserver.recordMetric({
      name: "workflow.execution.totalExecutionTime",
      value: 1,
      unit: "Milliseconds",
      tags: { executionPlanId: "perf-serialization" },
    });

    const diagnosticsSnapshot = snapshotObserver.snapshot();
    queryFacade.record(diagnosticsSnapshot);

    const serializationMs = await benchmarkAverageMs(250, () => {
      serializer.serialize(diagnosticsSnapshot);
    });

    const queryMs = await benchmarkAverageMs(500, () => {
      queryFacade.getByExecutionId("perf-serialization");
    });

    console.info(
      "CERT_PERF",
      JSON.stringify({
        mapperMs,
        pipelineMs,
        adapterMs,
        diagnosticsOverheadPercent,
        serializationMs,
        queryMs,
      })
    );

    expect(pipelineMs).toBeLessThan(TARGETS.pipelineDispatchMs);
    expect(mapperMs).toBeLessThan(TARGETS.mapperMs);
    expect(adapterMs).toBeLessThan(TARGETS.adapterMs);
    expect(diagnosticsOverheadPercent).toBeLessThan(TARGETS.diagnosticsOverheadPercent);
    expect(serializationMs).toBeLessThan(TARGETS.serializationMs);
    expect(queryMs).toBeLessThan(TARGETS.queryMs);
  });

  test("certifies memory controls and bounded allocations", async () => {
    const collector = new ExecutionDiagnosticsCollector({
      samplingPolicy: {
        traceSampleRate: 0.1,
        metricSampleRate: 0.1,
        maxTraceRecords: 50,
        maxMetricSamples: 50,
      },
    });

    const observer = collector.begin(buildCorrelation("memory", "memory"));
    for (let index = 0; index < 5000; index += 1) {
      observer.recordTrace({
        timestamp: new Date(1_700_000_000_000 + index),
        stage: "RuntimeExecution",
        component: "ExecutionPipeline",
        operation: "StageStarted",
        duration: 0,
        status: "Started",
        correlationId: "memory",
        diagnostics: { index },
      });
      observer.recordMetric({
        name: "workflow.execution.stageDuration",
        value: index,
        unit: "Milliseconds",
        tags: { stageId: "RuntimeExecution" },
      });
    }

    const snapshot = observer.snapshot();
    expect(snapshot.trace.length).toBeLessThanOrEqual(50);
    expect(snapshot.metrics.samples.length).toBeLessThanOrEqual(50);

    const queryFacade = new InMemoryExecutionDiagnosticsQueryFacade(100);
    for (let index = 0; index < 1000; index += 1) {
      const nextObserver = collector.begin(buildCorrelation(`memory-${index}`, `memory-${index}`));
      nextObserver.recordMetric({
        name: "workflow.execution.totalExecutionTime",
        value: 1,
        unit: "Milliseconds",
        tags: { executionPlanId: `${index}` },
      });
      queryFacade.record(nextObserver.snapshot());
    }

    expect(queryFacade.listRecent(200).length).toBe(100);
    expect(queryFacade.getByExecutionId("memory-0")).toBeUndefined();
    expect(queryFacade.getByExecutionId("memory-999")).toBeDefined();
  });

  test("certifies concurrency, isolation, and transaction propagation", async () => {
    const plan = await buildExecutionPlan();
    const registry = new WorkflowExecutorRegistry();
    registry.register(new ExecutedTestExecutor());
    const pipeline = buildPipeline(registry);

    const collector = new ExecutionDiagnosticsCollector();
    const concurrent = await Promise.all(
      Array.from({ length: 500 }, async (_, index) => {
        const correlationId = `concurrent-${index}`;
        const observer = collector.begin(buildCorrelation(`exec-${index}`, correlationId));
        return pipeline.execute(buildContext(plan, correlationId, observer));
      })
    );

    expect(concurrent).toHaveLength(500);
    expect(concurrent.every((item) => item.status === "Executed")).toBe(true);
    expect(new Set(concurrent.map((item) => item.correlationId)).size).toBe(500);

    const transactionIds = new Set<string>();
    const adapter = new RuntimeApplicationExecutor({
      submit: async (ctx: any) => {
        transactionIds.add(ctx.transaction?.id);
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
        } as RuntimeOperationResult;
      },
    } as any);

    await Promise.all(
      Array.from({ length: 200 }, (_, index) =>
        adapter.execute({
          executionPlanId: plan.id,
          executionHash: plan.metadata.deterministicHash,
          correlationId: `adapter-${index}`,
          effectCode: `effect-${index}`,
          effectType: "StateChange",
          operation: "Submit",
          runtimeContext: runtimeContext(`adapter-${index}`),
          runtimeTransaction: { id: `txn-${index}` } as any,
          payload: {},
          metadata: {},
        })
      )
    );

    expect(transactionIds.size).toBe(200);
    expect(transactionIds.has("txn-199")).toBe(true);
  });

  test("certifies determinism and snapshot reproducibility", async () => {
    const snapshot = buildWorkflowSnapshot();
    const actionRegistry = new WorkflowActionRegistry();
    actionRegistry.register(new PlatformActionProvider());
    const orchestrator = new WorkflowExecutionOrchestrator(
      new WorkflowActionEngine(actionRegistry),
      new WorkflowPolicyEngine([new GenericPolicyProvider()]),
      new RuntimeEffectPlanner(new RuntimeEffectGraphBuilder()),
      new ExecutionPlanBuilder(),
      {
        registerStage: () => undefined,
        getStages: () => [],
        execute: async (context: IExecutionContext) => ({
          success: true,
          status: context.executionRequested ? "Executed" : "Planned",
          executionPlanId: context.executionPlan.id,
          executionHash: context.executionHash,
          correlationId: context.correlationId,
          executedEffectCodes: [],
          deferredEffectCodes: [...context.executionPlan.orderedEffectCodes],
          skippedEffectCodes: [],
          failedEffectCodes: [],
          warnings: [],
          runtimeOperationResults: [],
          stageResults: [],
          executionTime: 0,
          diagnostics: {},
        }),
      }
    );

    const planA = await orchestrator.plan({
      snapshot,
      transitionCode: "SUBMIT",
      context: {
        runtimeContext: runtimeContext("det-a"),
        workflowVariables: {},
        workflowAssignments: [],
      },
    });

    const planB = await orchestrator.plan({
      snapshot,
      transitionCode: "SUBMIT",
      context: {
        runtimeContext: runtimeContext("det-b"),
        workflowVariables: {},
        workflowAssignments: [],
      },
    });

    expect(planA.metadata.deterministicHash).toBe(planB.metadata.deterministicHash);
    expect(planA.orderedEffectCodes).toEqual(planB.orderedEffectCodes);

    const collector = new ExecutionDiagnosticsCollector();
    const observerA = collector.begin(buildCorrelation("determinism", "determinism"));
    const observerB = collector.begin(buildCorrelation("determinism", "determinism"));

    const fixedTrace = {
      traceId: "trace-001",
      timestamp: new Date("2026-01-01T00:00:00.000Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionStarted",
      duration: 0,
      status: "Started" as const,
      correlationId: "determinism",
      diagnostics: {},
    };

    observerA.recordTrace(fixedTrace);
    observerB.recordTrace(fixedTrace);
    observerA.recordMetric({
      name: "workflow.execution.totalExecutionTime",
      value: 1,
      unit: "Milliseconds",
      tags: { executionPlanId: "determinism" },
    });
    observerB.recordMetric({
      name: "workflow.execution.totalExecutionTime",
      value: 1,
      unit: "Milliseconds",
      tags: { executionPlanId: "determinism" },
    });

    const snapshotA = observerA.snapshot();
    const snapshotB = observerB.snapshot();

    const serializer = new ExecutionDiagnosticsSerializer();
    const serializedA = serializer.serialize(snapshotA);
    const serializedB = serializer.serialize(snapshotB);

    expect(serializedA).toBe(serializedB);
  });

  test("certifies stress profiles and high-volume diagnostics", async () => {
    const basePlan = await buildExecutionPlan();
    const largePlan = expandPlan(basePlan, 200);
    const registry = new WorkflowExecutorRegistry();
    registry.register(new ExecutedTestExecutor());
    const pipeline = buildPipeline(registry);

    let sequentialFailures = 0;
    for (let index = 0; index < 1000; index += 1) {
      const observer = new ExecutionDiagnosticsCollector({
        samplingPolicy: {
          traceSampleRate: index % 2 === 0 ? 1 : 0.2,
          metricSampleRate: index % 2 === 0 ? 1 : 0.2,
          maxTraceRecords: 500,
          maxMetricSamples: 500,
        },
      }).begin(buildCorrelation(`seq-${index}`, `seq-${index}`));

      const result = await pipeline.execute(buildContext(largePlan, `seq-${index}`, observer));
      if (result.status === "Failed") {
        sequentialFailures += 1;
      }
    }

    const concurrent = await Promise.all(
      Array.from({ length: 500 }, async (_, index) => {
        const observer = new ExecutionDiagnosticsCollector({
          samplingPolicy: {
            traceSampleRate: 0.5,
            metricSampleRate: 0.5,
            maxTraceRecords: 500,
            maxMetricSamples: 500,
          },
        }).begin(buildCorrelation(`conc-${index}`, `conc-${index}`));

        return pipeline.execute(buildContext(basePlan, `conc-${index}`, observer));
      })
    );

    expect(sequentialFailures).toBe(0);
    expect(concurrent.every((result) => result.status !== "Failed")).toBe(true);
  });

  test("certifies recovery and graceful failure modes", async () => {
    const plan = await buildExecutionPlan();
    const emptyRegistry = new WorkflowExecutorRegistry();
    const missingExecutorPipeline = buildPipeline(emptyRegistry);

    const missingExecutorResult = await missingExecutorPipeline.execute(buildContext(plan, "recovery-missing"));
    expect(missingExecutorResult.status).toBe("Failed");

    const throwingRegistry = new WorkflowExecutorRegistry();
    throwingRegistry.register(new ThrowingExecutor());
    const throwingPipeline = buildPipeline(throwingRegistry);

    await expect(throwingPipeline.execute(buildContext(plan, "recovery-throw"))).rejects.toThrow(
      "Runtime executor failure."
    );

    const deferredResult = await missingExecutorPipeline.execute({
      ...buildContext(plan, "recovery-deferred"),
      executionRequested: false,
    });

    expect(deferredResult.status).toBe("Planned");

    const failingDiagnosticsCollector: IExecutionDiagnosticsCollector = {
      begin: () => buildNoopCollector().begin(buildCorrelation("diag-fail", "diag-fail")),
      validate: () => {
        throw new Error("Diagnostics validation failed.");
      },
    };

    const orchestrator = new WorkflowExecutionOrchestrator(
      new WorkflowActionEngine((() => {
        const registry = new WorkflowActionRegistry();
        registry.register(new PlatformActionProvider());
        return registry;
      })()),
      new WorkflowPolicyEngine([new GenericPolicyProvider()]),
      new RuntimeEffectPlanner(new RuntimeEffectGraphBuilder()),
      new ExecutionPlanBuilder(),
      {
        registerStage: () => undefined,
        getStages: () => [],
        execute: async (context: IExecutionContext): Promise<IExecutionResult> => ({
          success: true,
          status: "Executed",
          executionPlanId: context.executionPlan.id,
          executionHash: context.executionHash,
          correlationId: context.correlationId,
          executedEffectCodes: [],
          deferredEffectCodes: [],
          skippedEffectCodes: [],
          failedEffectCodes: [],
          warnings: [],
          runtimeOperationResults: [],
          stageResults: [],
          executionTime: 0,
          diagnostics: {},
          observability: buildNoopCollector().begin(buildCorrelation("diag-fail", "diag-fail")).snapshot(),
        }),
      }
    );

    await expect(
      orchestrator.orchestrate({
        snapshot: buildWorkflowSnapshot(),
        transitionCode: "SUBMIT",
        diagnosticsCollector: failingDiagnosticsCollector,
        context: {
          runtimeContext: runtimeContext("diag-fail"),
          workflowVariables: {},
          workflowAssignments: [],
        },
      })
    ).rejects.toThrow("Diagnostics validation failed.");
  });

  test("certifies guardrails and public API freeze assertions", () => {
    const orchestratorSource = readSource("src/modules/platform/workflow/services/WorkflowExecutionOrchestrator.ts");
    const mapperSource = readSource("src/modules/platform/workflow/services/ExecutionMapper.ts");
    const adapterSource = readSource("src/modules/platform/workflow/services/RuntimeApplicationExecutor.ts");
    const runtimeBarrelSource = readSource("src/modules/platform/runtime/application/index.ts");

    expect(orchestratorSource).toContain("executionPipeline.execute");
    expect(orchestratorSource).not.toContain("runtimeDataEngine");
    expect(mapperSource).not.toContain(".execute(");
    expect(adapterSource).not.toContain("WorkflowRepository");
    expect(adapterSource).not.toContain("runtimeDataEngine");
    expect(runtimeBarrelSource).not.toContain("createWorkflowFoundation");
    expect(runtimeBarrelSource).not.toContain("WorkflowExecutionOrchestrator");
  });
});
