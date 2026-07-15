import { RuntimeContext } from "../models/RuntimeContext";

describe("RuntimeContext", () => {
  test("creates immutable context with required fields", () => {
    const context = RuntimeContext.create({
      tenantId: "tenant-1",
      organizationId: "org-1",
      moduleId: "platform",
      entityId: "department",
      operation: "Create",
      userId: "user-1",
      roles: ["ADMIN"],
      permissions: ["Department.Create"],
    });

    expect(context.tenantId).toBe("tenant-1");
    expect(context.tenant.id).toBe("tenant-1");
    expect(context.operation).toBe("Create");
    expect(Object.isFrozen(context)).toBe(true);
    expect(Array.isArray(context.roles)).toBe(true);
    expect(Object.isFrozen(context.roles)).toBe(true);
    expect(context.requestId).toBeDefined();
    expect(context.correlationId).toBeDefined();
    expect(context.transaction.id).toBe(context.transactionId);
    expect(context.transactionId).toBeDefined();
  });

  test("with() returns new immutable context", () => {
    const source = RuntimeContext.create({
      tenantId: "tenant-1",
      organizationId: "org-1",
      moduleId: "platform",
      entityId: "department",
      operation: "Load",
      userId: "user-1",
    });

    const updated = source.with({ operation: "Save", recordId: "record-1" });

    expect(source.operation).toBe("Load");
    expect(updated.operation).toBe("Save");
    expect(updated.recordId).toBe("record-1");
    expect(updated.correlationId).toBe(source.correlationId);
    expect(updated.transactionId).toBe(source.transactionId);
    expect(Object.isFrozen(updated)).toBe(true);
  });
});
