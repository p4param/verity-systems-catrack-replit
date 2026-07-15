import { RuntimeApplicationEngine } from "../RuntimeApplicationEngine";
import { RuntimeContext } from "../models/RuntimeContext";
import type { IRuntimeOperationPipeline } from "../contracts/IRuntimeOperationPipeline";

function baseContext(): RuntimeContext {
  return RuntimeContext.create({
    tenantId: "tenant-1",
    organizationId: "org-1",
    moduleId: "platform",
    entityId: "department",
    operation: "Load",
    userId: "user-1",
  });
}

describe("RuntimeApplicationEngine", () => {
  test("dispatches convenience methods with expected operation", async () => {
    const execute = jest.fn(async (context: RuntimeContext) => ({
      success: true,
      messages: [],
      warnings: [],
      errors: [],
      validationErrors: [],
      businessRuleErrors: [],
      workflowErrors: [],
      recordId: context.recordId ?? null,
      affectedRows: 1,
      correlationId: context.correlationId,
      executionTime: 1,
      operation: context.operation,
      metadata: {},
      diagnostics: {
        pipelineTime: 1,
        metadataTime: 0,
        authorizationTime: 0,
        validationTime: 0,
        businessRulesTime: 0,
        workflowTime: 0,
        persistenceTime: 0,
        notificationTime: 0,
        auditTime: 0,
        totalTime: 1,
        middleware: {},
      },
    }));

    const pipeline: IRuntimeOperationPipeline = {
      execute,
      registerMiddleware: jest.fn(),
      registerAction: jest.fn(),
      registerValidator: jest.fn(),
      registerRule: jest.fn(),
      registerWorkflow: jest.fn(),
    };
    const engine = new RuntimeApplicationEngine(pipeline);
    const context = baseContext();

    await engine.create(context, {});
    await engine.load(context, {});
    await engine.save(context.with({ recordId: "r1" }), {});
    await engine.delete(context.with({ recordId: "r1" }));
    await engine.restore(context.with({ recordId: "r1" }));
    await engine.duplicate(context.with({ recordId: "r1" }), {});
    await engine.archive(context.with({ recordId: "r1" }), {});
    await engine.submit(context.with({ recordId: "r1" }), {});
    await engine.approve(context.with({ recordId: "r1" }), {});
    await engine.reject(context.with({ recordId: "r1" }), {});
    await engine.cancel(context.with({ recordId: "r1" }), {});
    await engine.close(context.with({ recordId: "r1" }), {});
    await engine.print(context.with({ recordId: "r1" }), {});
    await engine.export(context.with({ recordId: "r1" }), {});
    await engine.import(context.with({ recordId: "r1" }), {});

    const operations = execute.mock.calls.map((call) => call[0].operation);
    expect(operations).toEqual([
      "Create",
      "Load",
      "Save",
      "Delete",
      "Restore",
      "Duplicate",
      "Archive",
      "Submit",
      "Approve",
      "Reject",
      "Cancel",
      "Close",
      "Print",
      "Export",
      "Import",
    ]);
  });
});
