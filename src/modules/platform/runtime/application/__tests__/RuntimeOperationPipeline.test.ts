import { RuntimeContext } from "../models/RuntimeContext";
import { RuntimeEvents } from "../events/RuntimeEvents";
import { SynchronousRuntimeEventPublisher } from "../services/SynchronousRuntimeEventPublisher";
import { RuntimeOperationPipeline } from "../pipeline/RuntimeOperationPipeline";
import { OperationDispatcher } from "../services/OperationDispatcher";
import type { IRuntimeRecordService } from "../contracts/IRuntimeRecordService";

function buildContext(operation: RuntimeContext["operation"], recordId?: string): RuntimeContext {
  return RuntimeContext.create({
    requestId: "req-1",
    tenantId: "tenant-1",
    tenant: { id: "tenant-1" },
    organizationId: "org-1",
    organization: { id: "org-1" },
    moduleId: "platform",
    module: { id: "platform", code: "platform" },
    entityId: "department",
    entity: { id: "department", code: "department" },
    operation,
    userId: "user-1",
    currentUser: {
      id: "user-1",
      roles: [],
      permissions: ["Department.View", "Department.Create", "Department.Edit", "Department.Delete"],
    },
    permissions: ["Department.View", "Department.Create", "Department.Edit", "Department.Delete"],
    recordId,
  });
}

function recordServiceMock(): jest.Mocked<IRuntimeRecordService> {
  return {
    load: jest.fn(async () => ({ id: "record-1", recordNumber: "REC-1", version: 1 } as any)),
    loadMany: jest.fn(async () => [{ id: "record-1" } as any]),
    create: jest.fn(async () => ({ id: "record-2", recordNumber: "REC-2", version: 1 } as any)),
    save: jest.fn(async () => ({ id: "record-1", recordNumber: "REC-1", version: 2 } as any)),
    delete: jest.fn(async () => undefined),
    restore: jest.fn(async () => undefined),
    duplicate: jest.fn(async () => ({ id: "record-3", recordNumber: "REC-3", version: 1 } as any)),
    archive: jest.fn(async () => ({ id: "record-1", recordNumber: "REC-1", version: 1 } as any)),
  };
}

describe("RuntimeOperationPipeline", () => {
  test("executes Create lifecycle and publishes events", async () => {
    const recordService = recordServiceMock();
    const publisher = new SynchronousRuntimeEventPublisher();
    const received: string[] = [];

    publisher.subscribe(RuntimeEvents.OperationStarted, async () => received.push(RuntimeEvents.OperationStarted));
    publisher.subscribe(RuntimeEvents.RecordCreating, async () => received.push(RuntimeEvents.RecordCreating));
    publisher.subscribe(RuntimeEvents.RecordCreated, async () => received.push(RuntimeEvents.RecordCreated));
    publisher.subscribe(RuntimeEvents.OperationCompleted, async () => received.push(RuntimeEvents.OperationCompleted));

    const pipeline = new RuntimeOperationPipeline({
      metadataResolver: async (ctx) => ctx,
      permissionResolver: async () => undefined,
      recordService,
      operationDispatcher: new OperationDispatcher(recordService),
      eventPublisher: publisher,
    });

    const result = await pipeline.execute(buildContext("Create"), { NAME: "Alpha" });

    expect(result.success).toBe(true);
    expect(result.operation).toBe("Create");
    expect((result.record as any).id).toBe("record-2");
    expect(result.affectedRows).toBe(1);
    expect(result.diagnostics.pipelineTime).toBeGreaterThanOrEqual(0);
    expect(received).toEqual([
      RuntimeEvents.OperationStarted,
      RuntimeEvents.RecordCreating,
      RuntimeEvents.RecordCreated,
      RuntimeEvents.OperationCompleted,
    ]);
    expect(recordService.create).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["Load", "load"],
    ["Save", "save"],
    ["Delete", "delete"],
    ["Restore", "restore"],
  ] as const)("executes %s operation", async (operation, method) => {
    const recordService = recordServiceMock();
    const pipeline = new RuntimeOperationPipeline({
      metadataResolver: async (ctx) => ctx,
      permissionResolver: async () => undefined,
      recordService,
      operationDispatcher: new OperationDispatcher(recordService),
      eventPublisher: new SynchronousRuntimeEventPublisher(),
    });

    const result = await pipeline.execute(
      buildContext(operation, operation === "Load" ? "record-1" : "record-1"),
      operation === "Save" ? { NAME: "Updated" } : undefined
    );

    expect(result.success).toBe(true);
    expect(recordService[method]).toHaveBeenCalled();
  });

  test("returns standardized failure result and publishes OperationFailed", async () => {
    const recordService = recordServiceMock();
    const publisher = new SynchronousRuntimeEventPublisher();
    const failed = jest.fn(async () => undefined);
    publisher.subscribe(RuntimeEvents.OperationFailed, failed);

    const pipeline = new RuntimeOperationPipeline({
      metadataResolver: async (ctx) => ctx,
      permissionResolver: async () => {
        throw new Error("Forbidden");
      },
      recordService,
      operationDispatcher: new OperationDispatcher(recordService),
      eventPublisher: publisher,
    });

    const result = await pipeline.execute(buildContext("Load", "record-1"));

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(["Forbidden"]);
    expect(result.affectedRows).toBe(0);
    expect(result.validationErrors).toEqual([]);
    expect(failed).toHaveBeenCalledTimes(1);
  });

  test("supports middleware and validator/rule/workflow registration", async () => {
    const recordService = recordServiceMock();
    const pipeline = new RuntimeOperationPipeline({
      metadataResolver: async (ctx) => ctx,
      permissionResolver: async () => undefined,
      recordService,
      operationDispatcher: new OperationDispatcher(recordService),
      eventPublisher: new SynchronousRuntimeEventPublisher(),
    });

    const middleware = jest.fn(async (_state, next) => {
      await next();
    });
    const validator = jest.fn(async () => undefined);
    const rule = jest.fn(async () => undefined);
    const workflow = jest.fn(async () => undefined);

    pipeline.registerMiddleware("TestMiddleware", middleware);
    pipeline.registerValidator("TestValidator", validator);
    pipeline.registerRule("TestRule", rule);
    pipeline.registerWorkflow("TestWorkflow", workflow);

    const result = await pipeline.execute(buildContext("Create"), { NAME: "Alpha" });

    expect(result.success).toBe(true);
    expect(middleware).toHaveBeenCalled();
    expect(validator).toHaveBeenCalled();
    expect(rule).toHaveBeenCalled();
    expect(workflow).toHaveBeenCalled();
  });

  test("supports registered actions for frozen operations", async () => {
    const recordService = recordServiceMock();
    const pipeline = new RuntimeOperationPipeline({
      metadataResolver: async (ctx) => ctx,
      permissionResolver: async () => undefined,
      recordService,
      operationDispatcher: new OperationDispatcher(recordService),
      eventPublisher: new SynchronousRuntimeEventPublisher(),
    });

    pipeline.registerAction("Submit", async () => ({ id: "submit-1" } as any));

    const result = await pipeline.execute(buildContext("Submit", "record-1"), { approvedBy: "user-1" });

    expect(result.success).toBe(true);
    expect((result.record as any).id).toBe("submit-1");
  });
});
