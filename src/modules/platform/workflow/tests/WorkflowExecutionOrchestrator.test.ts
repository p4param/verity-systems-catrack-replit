import type { IExecutionContext } from "../contracts/IExecutionContext";
import type { IExecutionPipeline } from "../contracts/IExecutionPipeline";
import type { IExecutionResult } from "../contracts/IExecutionResult";
import { ExecutionPlanBuilder } from "../services/ExecutionPlanBuilder";
import { RuntimeEffectGraphBuilder } from "../services/RuntimeEffectGraphBuilder";
import { RuntimeEffectPlanner } from "../services/RuntimeEffectPlanner";
import { WorkflowActionEngine } from "../services/WorkflowActionEngine";
import { WorkflowActionRegistry } from "../services/WorkflowActionRegistry";
import { WorkflowExecutionOrchestrator } from "../services/WorkflowExecutionOrchestrator";
import { WorkflowPolicyEngine } from "../services/WorkflowPolicyEngine";
import { PlatformActionProvider } from "../services/action-providers";
import { GenericPolicyProvider } from "../services/policy-providers";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

class RecordingPipeline implements IExecutionPipeline {
  public callCount = 0;
  public lastContext: IExecutionContext | null = null;

  registerStage(): void {}
  getStages(): readonly [] {
    return [];
  }

  async execute(context: IExecutionContext): Promise<IExecutionResult> {
    this.callCount += 1;
    this.lastContext = context;
    return {
      success: true,
      status: context.executionRequested ? "Deferred" : "Planned",
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
    };
  }
}

describe("Workflow execution orchestrator", () => {
  test("builds deterministic execution plan through pipeline without execution by default", async () => {
    const snapshot = buildWorkflowSnapshot();
    const actionRegistry = new WorkflowActionRegistry();
    actionRegistry.register(new PlatformActionProvider());

    const pipeline = new RecordingPipeline();
    const orchestrator = new WorkflowExecutionOrchestrator(
      new WorkflowActionEngine(actionRegistry),
      new WorkflowPolicyEngine([new GenericPolicyProvider()]),
      new RuntimeEffectPlanner(new RuntimeEffectGraphBuilder()),
      new ExecutionPlanBuilder(),
      pipeline
    );

    const result = await orchestrator.orchestrate({
      snapshot,
      transitionCode: "SUBMIT",
      context: {
        runtimeContext: {} as any,
        workflowVariables: {},
        workflowAssignments: [],
      },
    });

    expect(result.status).toBe("Planned");
    expect(pipeline.callCount).toBe(1);
    expect(pipeline.lastContext?.executionRequested).toBe(false);
    expect(pipeline.lastContext?.executionPlan.transitionCode).toBe("SUBMIT");
    expect(pipeline.lastContext?.executionPlan.orderedEffectCodes.length).toBeGreaterThan(0);
  });

  test("sets executionRequested only when executePlan is true", async () => {
    const snapshot = buildWorkflowSnapshot();
    const actionRegistry = new WorkflowActionRegistry();
    actionRegistry.register(new PlatformActionProvider());

    const pipeline = new RecordingPipeline();
    const orchestrator = new WorkflowExecutionOrchestrator(
      new WorkflowActionEngine(actionRegistry),
      new WorkflowPolicyEngine([new GenericPolicyProvider()]),
      new RuntimeEffectPlanner(new RuntimeEffectGraphBuilder()),
      new ExecutionPlanBuilder(),
      pipeline
    );

    const result = await orchestrator.orchestrate({
      snapshot,
      transitionCode: "SUBMIT",
      executePlan: true,
      context: {
        runtimeContext: {} as any,
        workflowVariables: {},
        workflowAssignments: [],
      },
    });

    expect(result.status).toBe("Deferred");
    expect(pipeline.callCount).toBe(1);
    expect(pipeline.lastContext?.executionRequested).toBe(true);
  });

  test("throws when transition does not exist", async () => {
    const snapshot = buildWorkflowSnapshot();
    const actionRegistry = new WorkflowActionRegistry();
    actionRegistry.register(new PlatformActionProvider());

    const orchestrator = new WorkflowExecutionOrchestrator(
      new WorkflowActionEngine(actionRegistry),
      new WorkflowPolicyEngine([new GenericPolicyProvider()]),
      new RuntimeEffectPlanner(new RuntimeEffectGraphBuilder()),
      new ExecutionPlanBuilder(),
      new RecordingPipeline()
    );

    await expect(
      orchestrator.plan({
        snapshot,
        transitionCode: "MISSING",
        context: {
          runtimeContext: {} as any,
          workflowVariables: {},
          workflowAssignments: [],
        },
      })
    ).rejects.toThrow("Transition MISSING is not defined");
  });
});
