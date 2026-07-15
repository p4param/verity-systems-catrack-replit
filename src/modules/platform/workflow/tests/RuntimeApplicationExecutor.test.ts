import { RuntimeContext } from "@/modules/platform/runtime/application/models/RuntimeContext";
import { RuntimeTransaction } from "@/modules/platform/runtime/application/models/RuntimeTransaction";
import type { IRuntimeApplicationEngine } from "@/modules/platform/runtime/application/contracts/IRuntimeApplicationEngine";
import { RuntimeApplicationExecutor } from "../services/RuntimeApplicationExecutor";
import type { IExecutionContext } from "../contracts/IExecutionContext";
import type { RuntimeOperationRequest } from "../contracts/IRuntimeOperationRequest";

function buildExecutionContext(runtimeApplicationEngine: IRuntimeApplicationEngine): IExecutionContext {
  const runtimeTransaction = RuntimeTransaction.create({ id: "txn-001" });
  const runtimeContext = RuntimeContext.create({
    tenantId: "tenant-001",
    organizationId: "org-001",
    moduleId: "platform",
    entityId: "incident",
    operation: "Submit",
    userId: "user-001",
    transaction: runtimeTransaction,
  });

  return {
    workflowContext: {
      runtimeContext,
      workflowVariables: {},
      workflowAssignments: [],
    },
    executionPlan: {
      id: "plan-001",
      workflowVersionId: "version-001",
      transitionCode: "SUBMIT",
      generatedAt: new Date("2026-01-01T00:00:00.000Z"),
      actionPlan: {
        workflowVersionId: "version-001",
        transitionCode: "SUBMIT",
        generatedAt: new Date("2026-01-01T00:00:00.000Z"),
        actions: [],
        diagnostics: {},
      },
      policyPlan: {
        workflowVersionId: "version-001",
        transitionCode: "SUBMIT",
        generatedAt: new Date("2026-01-01T00:00:00.000Z"),
        policies: [],
        diagnostics: {},
      },
      runtimeEffectSet: {
        workflowVersionId: "version-001",
        transitionCode: "SUBMIT",
        generatedAt: new Date("2026-01-01T00:00:00.000Z"),
        effects: [
          {
            effectCode: "SUBMIT::SUBMIT_ACTION",
            effectType: "StateChange",
            actionCode: "SUBMIT_ACTION",
            dependencies: [],
            priority: 1,
            parallelizable: true,
            policyMetadata: {},
            metadata: {
              runtimeOperation: "Submit",
              payload: { recordId: "record-001" },
            },
          },
        ],
      },
      dependencyGraph: {
        actionGraph: { nodes: [], edges: [] },
        policyGraph: { nodes: [], edges: [] },
        runtimeEffectGraph: { nodes: [], edges: [] },
        executionGraph: { nodes: [], edges: [] },
      },
      orderedEffectCodes: ["SUBMIT::SUBMIT_ACTION"],
      parallelBatches: [["SUBMIT::SUBMIT_ACTION"]],
      diagnostics: {
        warnings: [],
        errors: [],
        providerDiagnostics: {},
        policyDiagnostics: {},
      },
      metadata: {
        deterministicHash: "hash-001",
        retryMetadata: {},
        timeoutMetadata: {},
        compensationMetadata: {},
        rollbackMetadata: {},
      },
    },
    runtimeContext,
    runtimeTransaction,
    executionRequested: true,
    executionHash: "hash-001",
    correlationId: runtimeContext.correlationId,
    diagnostics: {},
    executionMetadata: {
      deterministicHash: "hash-001",
      retryMetadata: {},
      timeoutMetadata: {},
      compensationMetadata: {},
      rollbackMetadata: {},
    },
    actionPlan: undefined,
    policyPlan: undefined,
    assignmentPlan: undefined,
    metadata: {},
    runtimeApplicationEngine,
  };
}

function buildRuntimeOperationRequest(context: IExecutionContext): RuntimeOperationRequest {
  return {
    executionPlanId: context.executionPlan.id,
    executionHash: context.executionHash,
    correlationId: context.correlationId,
    effectCode: context.executionPlan.runtimeEffectSet.effects[0].effectCode,
    effectType: context.executionPlan.runtimeEffectSet.effects[0].effectType,
    operation: "Submit",
    runtimeContext: context.runtimeContext,
    runtimeTransaction: context.runtimeTransaction,
    payload: { recordId: "record-001" },
    metadata: {},
  };
}

describe("RuntimeApplicationExecutor", () => {
  test("routes runtime operations through RuntimeApplicationEngine with transaction propagation", async () => {
    const runtimeEngine: IRuntimeApplicationEngine = {
      execute: jest.fn(),
      create: jest.fn(),
      load: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      duplicate: jest.fn(),
      archive: jest.fn(),
      submit: jest.fn(async (context, payload) => ({
        success: true,
        messages: [],
        warnings: [],
        errors: [],
        validationErrors: [],
        businessRuleErrors: [],
        workflowErrors: [],
        recordId: "record-001",
        affectedRows: 1,
        correlationId: context.correlationId,
        executionTime: 5,
        operation: "Submit",
        metadata: { payload },
        diagnostics: {
          pipelineTime: 1,
          metadataTime: 1,
          authorizationTime: 1,
          validationTime: 1,
          businessRulesTime: 1,
          workflowTime: 1,
          persistenceTime: 1,
          notificationTime: 0,
          auditTime: 0,
          totalTime: 5,
          middleware: {},
        },
      })),
      approve: jest.fn(),
      reject: jest.fn(),
      cancel: jest.fn(),
      close: jest.fn(),
      print: jest.fn(),
      export: jest.fn(),
      import: jest.fn(),
    };

    const executor = new RuntimeApplicationExecutor(runtimeEngine);
    const context = buildExecutionContext(runtimeEngine);
    const request = buildRuntimeOperationRequest(context);

    const result = await executor.execute(request);

    expect(result.status).toBe("Executed");
    expect(runtimeEngine.submit).toHaveBeenCalledTimes(1);
    const [runtimeContext, payload] = (runtimeEngine.submit as jest.Mock).mock.calls[0];
    expect(runtimeContext.transactionId).toBe(context.runtimeTransaction.id);
    expect(payload).toEqual({ recordId: "record-001" });
    expect(result.response?.runtimeOperationResult?.correlationId).toBe(context.correlationId);
  });

  test("throws when the runtime application engine is not provided", async () => {
    const runtimeEngine: IRuntimeApplicationEngine = {
      execute: jest.fn(),
      create: jest.fn(),
      load: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      duplicate: jest.fn(),
      archive: jest.fn(),
      submit: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      cancel: jest.fn(),
      close: jest.fn(),
      print: jest.fn(),
      export: jest.fn(),
      import: jest.fn(),
    };

    const executor = new RuntimeApplicationExecutor();
    const context = buildExecutionContext(runtimeEngine);
    const request = buildRuntimeOperationRequest(context);

    await expect(executor.execute(request)).rejects.toThrow(
      "RuntimeApplicationEngine is required for runtime application execution."
    );
    expect(runtimeEngine.submit).not.toHaveBeenCalled();
  });
});
