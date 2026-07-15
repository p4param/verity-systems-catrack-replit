import type { IExecutionContext } from "../contracts/IExecutionContext";
import type { IExecutionResult } from "../contracts/IExecutionResult";
import type { IExecutionStage } from "../contracts/IExecutionStage";
import type { IWorkflowExecutor } from "../contracts/IWorkflowExecutor";
import type { ExecutionCapabilities } from "../contracts/IWorkflowExecutor";
import type { RuntimeOperationRequest } from "../contracts/IRuntimeOperationRequest";
import { ExecutionDispatchStage } from "../services/ExecutionDispatchStage";
import { ExecutionMapper } from "../services/ExecutionMapper";
import { ExecutionPipeline } from "../services/ExecutionPipeline";
import { ExecutionPlanningStage } from "../services/ExecutionPlanningStage";
import { WorkflowExecutorRegistry } from "../services/WorkflowExecutorRegistry";
import { buildWorkflowSnapshot } from "./WorkflowTestData";
import { ExecutionPlanBuilder } from "../services/ExecutionPlanBuilder";
import { RuntimeEffectGraphBuilder } from "../services/RuntimeEffectGraphBuilder";
import { RuntimeEffectPlanner } from "../services/RuntimeEffectPlanner";
import { WorkflowActionEngine } from "../services/WorkflowActionEngine";
import { WorkflowActionRegistry } from "../services/WorkflowActionRegistry";
import { WorkflowPolicyEngine } from "../services/WorkflowPolicyEngine";
import { PlatformActionProvider } from "../services/action-providers";
import { GenericPolicyProvider } from "../services/policy-providers";

class TestStage implements IExecutionStage {
  constructor(
    public readonly stageId: string,
    public readonly order: number,
    private readonly callOrder: string[]
  ) {}

  async execute(
    context: IExecutionContext,
    next: (context: IExecutionContext) => Promise<IExecutionResult>
  ): Promise<IExecutionResult> {
    this.callOrder.push(this.stageId);
    return next(context);
  }
}

class ExecutingTestExecutor implements IWorkflowExecutor {
  readonly executorKey = "test.executor";
  readonly supportedEffectTypes = ["StateChange"] as const;
  readonly capabilities: ExecutionCapabilities = {
    SupportsTransactions: true,
    SupportsRollback: true,
    SupportsRetry: true,
    SupportsCompensation: true,
    SupportsAsync: true,
    SupportsIdempotency: true,
    SupportsDiagnostics: true,
    SupportsSimulation: true,
  };
  readonly executionPriority = 10;

  async execute(request: RuntimeOperationRequest): Promise<{ status: "Executed"; request: RuntimeOperationRequest }> {
    return {
      status: "Executed",
      request,
    };
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
    runtimeContext: {} as any,
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

  return new ExecutionPlanBuilder().build(transition, actionPlan, policyPlan, effectResolution);
}

describe("Execution pipeline and executor registry", () => {
  test("runs stages in ascending order", async () => {
    const callOrder: string[] = [];
    const pipeline = new ExecutionPipeline();
    pipeline.registerStage(new TestStage("third", 300, callOrder));
    pipeline.registerStage(new TestStage("first", 100, callOrder));
    pipeline.registerStage(new TestStage("second", 200, callOrder));

    const executionPlan = await buildExecutionPlan();

    await pipeline.execute({
      executionPlan,
      workflowContext: {
        runtimeContext: {} as any,
        workflowVariables: {},
        workflowAssignments: [],
      },
      runtimeContext: {} as any,
      runtimeTransaction: {} as any,
      executionHash: executionPlan.metadata.deterministicHash,
      correlationId: "test-correlation-id",
      diagnostics: {},
      executionMetadata: executionPlan.metadata,
      actionPlan: undefined,
      policyPlan: undefined,
      assignmentPlan: undefined,
      executionRequested: false,
      metadata: {},
    });

    expect(callOrder).toEqual(["first", "second", "third"]);
  });

  test("registry resolves executor by effect type", () => {
    const registry = new WorkflowExecutorRegistry();
    const executor = new ExecutingTestExecutor();

    registry.register(executor);

    expect(registry.getByEffectType("StateChange")).toBe(executor);
    expect(registry.getByEffectType("UnknownType")).toBeNull();
  });

  test("registry rejects duplicate executors and missing compatibility targets", () => {
    const registry = new WorkflowExecutorRegistry();
    const executor = new ExecutingTestExecutor();

    registry.register(executor);

    expect(() => registry.register(executor)).toThrow("Duplicate executor registered");
    expect(() => registry.validateCompatibility("MissingType")).toThrow("Missing executor for effect type MissingType.");
  });

  test("dispatch stage uses registry and executes supported effects", async () => {
    const registry = new WorkflowExecutorRegistry();
    registry.register(new ExecutingTestExecutor());

    const pipeline = new ExecutionPipeline();
    pipeline.registerStage(new ExecutionPlanningStage());
    pipeline.registerStage(new ExecutionDispatchStage(new ExecutionMapper(), registry));

    const executionPlan = await buildExecutionPlan();
    executionPlan.runtimeEffectSet.effects[0] = {
      ...executionPlan.runtimeEffectSet.effects[0],
      metadata: {
        ...(executionPlan.runtimeEffectSet.effects[0].metadata ?? {}),
        runtimeOperation: "Submit",
        payload: { recordId: "record-001" },
      },
    };

    const result = await pipeline.execute({
      executionPlan,
      workflowContext: {
        runtimeContext: {} as any,
        workflowVariables: {},
        workflowAssignments: [],
      },
      runtimeContext: {} as any,
      runtimeTransaction: {} as any,
      executionHash: executionPlan.metadata.deterministicHash,
      correlationId: "test-correlation-id",
      diagnostics: {},
      executionMetadata: executionPlan.metadata,
      actionPlan: undefined,
      policyPlan: undefined,
      assignmentPlan: undefined,
      executionRequested: true,
      metadata: {},
    });

    expect(result.status).toBe("Executed");
    expect(result.executedEffectCodes.length).toBeGreaterThan(0);
    expect(result.deferredEffectCodes.length).toBe(0);
  });
});
