import { WorkflowVersionManager } from "../services/WorkflowVersionManager";

function buildVersion(status: "Draft" | "Published" | "Archived" | "Deprecated", versionNumber = 1) {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    workflowDefinitionId: crypto.randomUUID(),
    versionNumber,
    status,
    isInitial: versionNumber === 1,
    createdAt: now,
    createdBy: crypto.randomUUID(),
    updatedAt: now,
    updatedBy: crypto.randomUUID(),
    version: 1,
  };
}

describe("WorkflowVersionManager", () => {
  test("creates next version number", async () => {
    const manager = new WorkflowVersionManager();
    const definitionId = crypto.randomUUID();
    const now = new Date();
    const next = await manager.createNextVersion(
      [
        {
          id: crypto.randomUUID(),
          workflowDefinitionId: definitionId,
          versionNumber: 1,
          status: "Draft",
          isInitial: true,
          createdAt: now,
          createdBy: crypto.randomUUID(),
          updatedAt: now,
          updatedBy: crypto.randomUUID(),
          version: 1,
        },
      ],
      crypto.randomUUID()
    );

    expect(next.versionNumber).toBe(2);
    expect(next.status).toBe("Draft");
  });

  test("validates status transitions", async () => {
    const manager = new WorkflowVersionManager();
    await expect(manager.validateStatusChange(buildVersion("Draft"), "Published")).resolves.toBeUndefined();
    await expect(manager.validateStatusChange(buildVersion("Archived"), "Published")).rejects.toThrow();
  });
});
