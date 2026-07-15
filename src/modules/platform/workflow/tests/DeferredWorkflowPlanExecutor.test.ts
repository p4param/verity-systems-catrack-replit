import { DeferredWorkflowPlanExecutor } from "../services/DeferredWorkflowPlanExecutor";

describe("Deferred workflow plan executor", () => {
  test("throws to enforce prompt 005 execution boundary", async () => {
    const executor = new DeferredWorkflowPlanExecutor();

    await expect(executor.execute({} as any, {} as any)).rejects.toThrow(
      "Workflow execution is deferred to Prompt 005 executor layer."
    );
  });
});
