import { readFileSync } from "fs";
import { resolve } from "path";

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Workflow execution guardrails", () => {
  test("orchestrator does not instantiate executors or touch persistence directly", () => {
    const source = readSource("src/modules/platform/workflow/services/WorkflowExecutionOrchestrator.ts");

    expect(source).not.toContain("new RuntimeApplicationExecutor");
    expect(source).not.toContain("new DeferredWorkflowExecutor");
    expect(source).not.toContain("new WorkflowRepository");
    expect(source).not.toContain("runtimeDataEngine");
    expect(source).not.toContain("createAuditLog");
    expect(source).not.toMatch(/\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b/);
  });

  test("runtime application executor only calls the runtime application boundary", () => {
    const source = readSource("src/modules/platform/workflow/services/RuntimeApplicationExecutor.ts");

    expect(source).toContain("runtimeApplicationEngine");
    expect(source).not.toContain("runtimeDataEngine");
    expect(source).not.toContain("createAuditLog");
    expect(source).not.toContain("WorkflowRepository");
  });

  test("execution pipeline is used as the runtime coordination boundary", () => {
    const source = readSource("src/modules/platform/workflow/services/WorkflowExecutionOrchestrator.ts");

    expect(source).toContain("executionPipeline.execute");
    expect(source).not.toContain("runtimeDataEngine");
  });

  test("runtime application barrel does not import workflow composition", () => {
    const source = readSource("src/modules/platform/runtime/application/index.ts");

    expect(source).not.toContain("createWorkflowFoundation");
    expect(source).not.toContain("workflowFoundation");
    expect(source).not.toContain("WorkflowExecutionOrchestrator");
    expect(source).not.toContain("WorkflowExecutorRegistry");
  });
});
