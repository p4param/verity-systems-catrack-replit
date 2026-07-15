import { readFileSync } from "fs";
import { resolve } from "path";
import { createHash } from "crypto";
import { StateMachineEngine } from "../services/StateMachineEngine";
import { WorkflowGraphBuilder } from "../services/WorkflowGraphBuilder";
import { WorkflowGraphValidator } from "../services/WorkflowGraphValidator";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

jest.setTimeout(120000);

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort((left, right) => left.localeCompare(right));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

function benchmarkAverageMs(iterations: number, fn: () => Promise<void> | void): Promise<number> {
  return (async () => {
    const startedAt = process.hrtime.bigint();
    for (let index = 0; index < iterations; index += 1) {
      await fn();
    }
    return Number(process.hrtime.bigint() - startedAt) / 1_000_000 / iterations;
  })();
}

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("VS07 Prompt 006B state machine and runtime graph certification", () => {
  test("certifies initial and terminal state validation", async () => {
    const engine = new StateMachineEngine();

    const missingInitial = buildWorkflowSnapshot();
    missingInitial.states = missingInitial.states.map((state) => ({ ...state, isInitial: false }));
    await expect(engine.buildRuntimeModel(missingInitial)).rejects.toThrow(/initial state/);

    const missingTerminal = buildWorkflowSnapshot();
    missingTerminal.states = missingTerminal.states.map((state) => ({ ...state, isTerminal: false }));
    await expect(engine.buildRuntimeModel(missingTerminal)).rejects.toThrow(/terminal state/);

    const multipleInitial = buildWorkflowSnapshot();
    multipleInitial.states[1].isInitial = true;
    await expect(engine.buildRuntimeModel(multipleInitial)).rejects.toThrow(/multiple initial states/);
  });

  test("certifies reachability and dead-end detection", () => {
    const snapshot = buildWorkflowSnapshot();
    snapshot.states.push({
      id: crypto.randomUUID(),
      workflowVersionId: snapshot.version.id,
      code: "UNREACHABLE",
      name: "Unreachable",
      isInitial: false,
      isTerminal: true,
      sequence: 5,
    });
    snapshot.states.push({
      id: crypto.randomUUID(),
      workflowVersionId: snapshot.version.id,
      code: "DEADEND",
      name: "Dead End",
      isInitial: false,
      isTerminal: false,
      sequence: 6,
    });
    snapshot.transitions.push({
      id: crypto.randomUUID(),
      workflowVersionId: snapshot.version.id,
      code: "TO_DEADEND",
      name: "To Dead End",
      sourceStateCode: "SUBMITTED",
      destinationStateCode: "DEADEND",
      actionCode: "SUBMIT_ACTION",
      priority: 2,
      sequence: 2,
      auditFlag: true,
      rollbackFlag: false,
    });

    const graph = new WorkflowGraphBuilder().build(snapshot);
    const issues = new WorkflowGraphValidator().validate(graph);

    expect(issues.some((item) => item.code === "WF_UNREACHABLE_STATE")).toBe(true);
    expect(issues.some((item) => item.code === "WF_UNREACHABLE_TERMINAL_STATE")).toBe(true);
    expect(issues.some((item) => item.code === "WF_DEAD_END_STATE")).toBe(true);
  });

  test("certifies runtime graph determinism and stable hash", async () => {
    const engine = new StateMachineEngine();
    const snapshot = buildWorkflowSnapshot();

    const first = await engine.buildRuntimeModel(snapshot);
    const second = await engine.buildRuntimeModel(snapshot);

    const firstSerialized = stableStringify(first.runtimeGraph);
    const secondSerialized = stableStringify(second.runtimeGraph);
    const firstHash = createHash("sha256").update(firstSerialized).digest("hex");
    const secondHash = createHash("sha256").update(secondSerialized).digest("hex");

    expect(first.runtimeGraph.workflowGraph.nodes.map((item) => item.code)).toEqual(
      second.runtimeGraph.workflowGraph.nodes.map((item) => item.code)
    );
    expect(first.runtimeGraph.workflowGraph.edges.map((item) => item.code)).toEqual(
      second.runtimeGraph.workflowGraph.edges.map((item) => item.code)
    );
    expect(firstSerialized).toBe(secondSerialized);
    expect(firstHash).toBe(secondHash);
  });

  test("certifies runtime graph immutability after publish-time generation", async () => {
    const engine = new StateMachineEngine();
    const model = await engine.buildRuntimeModel(buildWorkflowSnapshot());

    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.runtimeGraph)).toBe(true);
    expect(Object.isFrozen(model.runtimeGraph.workflowGraph.nodes)).toBe(true);
    expect(Object.isFrozen(model.runtimeGraph.workflowGraph.edges)).toBe(true);
  });

  test("certifies performance targets for graph generation, validation, and serialization", async () => {
    const snapshot = buildWorkflowSnapshot();
    const engine = new StateMachineEngine();
    const builder = new WorkflowGraphBuilder();
    const validator = new WorkflowGraphValidator();

    const generationMs = await benchmarkAverageMs(300, () => {
      builder.build(snapshot);
    });

    const graph = builder.build(snapshot);
    const validationMs = await benchmarkAverageMs(300, () => {
      validator.validate(graph);
    });

    const serializationMs = await benchmarkAverageMs(500, () => {
      stableStringify(graph);
    });

    const lookupMs = await benchmarkAverageMs(500, async () => {
      const model = await engine.buildRuntimeModel(snapshot);
      model.runtimeGraph.transitionGraph.transitionsBySourceState.DRAFT;
    });

    console.info(
      "CERT_P006B",
      JSON.stringify({ generationMs, validationMs, serializationMs, lookupMs })
    );

    expect(generationMs).toBeLessThan(20);
    expect(validationMs).toBeLessThan(20);
    expect(serializationMs).toBeLessThan(10);
    expect(lookupMs).toBeLessThan(20);
  });

  test("certifies guardrails for runtime graph usage", () => {
    const middlewareSource = readSource("src/modules/platform/workflow/runtime/WorkflowMiddleware.ts");
    const stateMachineSource = readSource("src/modules/platform/workflow/services/StateMachineEngine.ts");
    const runtimeBarrelSource = readSource("src/modules/platform/runtime/application/index.ts");

    expect(middlewareSource).toContain("getManifest");
    expect(middlewareSource).not.toContain("designerSnapshot");
    expect(stateMachineSource).toContain("deepFreeze");
    expect(runtimeBarrelSource).not.toContain("WorkflowGraphBuilder");
  });
});
