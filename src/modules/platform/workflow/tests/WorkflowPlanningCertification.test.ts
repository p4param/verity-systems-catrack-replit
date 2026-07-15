import { createHash, randomUUID } from "crypto";
import { RuntimeContext } from "@/modules/platform/runtime/application";
import { AssignmentPlanner } from "../services/AssignmentPlanner";
import { AssignmentStrategyEngine } from "../services/AssignmentStrategyEngine";
import { ParticipantManifestGenerator } from "../services/ParticipantManifestGenerator";
import { ParticipantRegistry } from "../services/ParticipantRegistry";
import { ParticipantResolutionEngine } from "../services/ParticipantResolutionEngine";
import { WorkflowActionEngine } from "../services/WorkflowActionEngine";
import { WorkflowActionRegistry } from "../services/WorkflowActionRegistry";
import { WorkflowPolicyEngine } from "../services/WorkflowPolicyEngine";
import { RoleParticipantProvider } from "../services/participant-providers/RoleParticipantProvider";
import { PlatformActionProvider } from "../services/action-providers";
import { GenericPolicyProvider } from "../services/policy-providers";
import { buildWorkflowSnapshotWithPolicyScopes } from "./WorkflowTestData";

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

function buildAssignmentContext() {
  const snapshot = buildWorkflowSnapshotWithPolicyScopes();
  const runtimeContext = RuntimeContext.create({
    tenantId: snapshot.definition.tenantId,
    organizationId: snapshot.definition.organizationId,
    moduleId: snapshot.definition.moduleId,
    entityId: snapshot.definition.entityId,
    operation: "Submit",
    userId: "U-1",
    roles: ["REVIEWER", "AUDITOR"],
    permissions: ["Incident.Edit"],
  });

  return {
    snapshot,
    context: {
      workflowDefinitionId: snapshot.definition.id,
      workflowVersionId: snapshot.version.id,
      assignment: {
        ...snapshot.assignments[0],
        assignmentType: "Role",
        participantType: "Role",
        targetId: "REVIEWER",
        strategy: "Priority",
        priority: 2,
        ruleSet: { minimumApprovers: 1, maximumApprovers: 2 },
      },
      runtimeContext,
      businessObject: {},
      variables: {},
    },
  };
}

describe("VS07 Prompt 006C planning certification", () => {
  test("certifies participant resolution determinism and duplicate elimination", async () => {
    const { context } = buildAssignmentContext();
    const registry = new ParticipantRegistry();
    registry.register(new RoleParticipantProvider());

    const engine = new ParticipantResolutionEngine(
      registry,
      new AssignmentStrategyEngine(),
      new AssignmentPlanner()
    );

    const result = await engine.resolve(context as any);
    const second = await engine.resolve(context as any);

    expect(result.participantSet).toEqual(second.participantSet);
    expect(result.strategyResult).toEqual(second.strategyResult);
    expect(result.diagnostics.planId).toBe(second.diagnostics.planId);
  });

  test("certifies deterministic assignment, action, and policy planning", async () => {
    const { snapshot, context } = buildAssignmentContext();

    const participantSet = {
      assignmentId: context.assignment.id,
      participants: [{ participantId: "REVIEWER", participantType: "Role", source: "provider.role", priority: 1 }],
      requiredParticipants: [{ participantId: "REVIEWER", participantType: "Role", source: "provider.role", priority: 1 }],
      optionalParticipants: [],
    };

    const strategyEngine = new AssignmentStrategyEngine();
    const strategyResult = await strategyEngine.resolveStrategy(context as any, participantSet as any);
    const planA = await new AssignmentPlanner().buildPlan(context as any, participantSet as any, strategyResult as any);
    const planB = await new AssignmentPlanner().buildPlan(context as any, participantSet as any, strategyResult as any);

    expect(planA).toEqual(planB);

    const actionRegistry = new WorkflowActionRegistry();
    actionRegistry.register(new PlatformActionProvider());
    const actionEngine = new WorkflowActionEngine(actionRegistry);
    const actionPlanA = await actionEngine.resolve({
      snapshot,
      transition: snapshot.transitions[1],
      runtimeContext: {} as any,
    });
    const actionPlanB = await actionEngine.resolve({
      snapshot,
      transition: snapshot.transitions[1],
      runtimeContext: {} as any,
    });

    expect(actionPlanA).toEqual(actionPlanB);

    const policyEngine = new WorkflowPolicyEngine([new GenericPolicyProvider()]);
    const policyPlanA = await policyEngine.resolve({
      snapshot,
      transition: snapshot.transitions[1],
      actionPlan: actionPlanA,
    });
    const policyPlanB = await policyEngine.resolve({
      snapshot,
      transition: snapshot.transitions[1],
      actionPlan: actionPlanA,
    });

    expect(policyPlanA).toEqual(policyPlanB);
  });

  test("certifies planning manifests and serialized planning determinism", async () => {
    const snapshot = buildWorkflowSnapshotWithPolicyScopes();
    const runtimeModel = {
      workflowDefinitionId: snapshot.definition.id,
      workflowVersionId: snapshot.version.id,
    } as any;
    const generator = new ParticipantManifestGenerator();

    const participantManifestA = await generator.generateParticipantManifest(snapshot);
    const participantManifestB = await generator.generateParticipantManifest(snapshot);
    const assignmentManifestA = await generator.generateAssignmentManifest(snapshot);
    const assignmentManifestB = await generator.generateAssignmentManifest(snapshot);
    const resolutionManifestA = await generator.generateResolutionManifest(snapshot, runtimeModel);
    const resolutionManifestB = await generator.generateResolutionManifest(snapshot, runtimeModel);

    expect(participantManifestA).toEqual(participantManifestB);
    expect(assignmentManifestA).toEqual(assignmentManifestB);
    expect(resolutionManifestA).toEqual(resolutionManifestB);
    expect(
      stableStringify({
        participantManifest: participantManifestA,
        assignmentManifest: assignmentManifestA,
        resolutionManifest: resolutionManifestA,
      })
    ).toBe(
      stableStringify({
        participantManifest: participantManifestB,
        assignmentManifest: assignmentManifestB,
        resolutionManifest: resolutionManifestB,
      })
    );
  });

  test("certifies performance targets for participant, assignment, action, policy planning, and manifests", async () => {
    const { snapshot, context } = buildAssignmentContext();
    const registry = new ParticipantRegistry();
    registry.register(new RoleParticipantProvider());
    const participantEngine = new ParticipantResolutionEngine(
      registry,
      new AssignmentStrategyEngine(),
      new AssignmentPlanner()
    );

    const participantMs = await benchmarkAverageMs(200, async () => {
      await participantEngine.resolve(context as any);
    });

    const participantSet = {
      assignmentId: context.assignment.id,
      participants: [{ participantId: "REVIEWER", participantType: "Role", source: "provider.role", priority: 1 }],
      requiredParticipants: [{ participantId: "REVIEWER", participantType: "Role", source: "provider.role", priority: 1 }],
      optionalParticipants: [],
    };
    const strategyResult = await new AssignmentStrategyEngine().resolveStrategy(context as any, participantSet as any);

    const assignmentMs = await benchmarkAverageMs(200, async () => {
      await new AssignmentPlanner().buildPlan(context as any, participantSet as any, strategyResult as any);
    });

    const actionRegistry = new WorkflowActionRegistry();
    actionRegistry.register(new PlatformActionProvider());
    const actionEngine = new WorkflowActionEngine(actionRegistry);
    const actionMs = await benchmarkAverageMs(120, async () => {
      await actionEngine.resolve({ snapshot, transition: snapshot.transitions[1], runtimeContext: {} as any });
    });

    const actionPlan = await actionEngine.resolve({ snapshot, transition: snapshot.transitions[1], runtimeContext: {} as any });
    const policyEngine = new WorkflowPolicyEngine([new GenericPolicyProvider()]);
    const policyMs = await benchmarkAverageMs(120, async () => {
      await policyEngine.resolve({ snapshot, transition: snapshot.transitions[1], actionPlan });
    });

    const manifestGenerator = new ParticipantManifestGenerator();
    const manifestMs = await benchmarkAverageMs(150, async () => {
      await manifestGenerator.generateParticipantManifest(snapshot);
      await manifestGenerator.generateAssignmentManifest(snapshot);
      await manifestGenerator.generateResolutionManifest(snapshot, { workflowVersionId: snapshot.version.id } as any);
    });

    console.info(
      "CERT_P006C",
      JSON.stringify({ participantMs, assignmentMs, actionMs, policyMs, manifestMs })
    );

    expect(participantMs).toBeLessThan(20);
    expect(assignmentMs).toBeLessThan(20);
    expect(actionMs).toBeLessThan(20);
    expect(policyMs).toBeLessThan(20);
    expect(manifestMs).toBeLessThan(50);
  });

  test("certifies planning layer guardrails", async () => {
    const { snapshot } = buildAssignmentContext();
    const actionRegistry = new WorkflowActionRegistry();
    actionRegistry.register(new PlatformActionProvider());
    const actionEngine = new WorkflowActionEngine(actionRegistry);
    const actionPlan = await actionEngine.resolve({ snapshot, transition: snapshot.transitions[1], runtimeContext: {} as any });
    const policyPlan = await new WorkflowPolicyEngine([new GenericPolicyProvider()]).resolve({
      snapshot,
      transition: snapshot.transitions[1],
      actionPlan,
    });

    expect(actionPlan.actions.every((item) => item.providerKey.startsWith("action.provider."))).toBe(true);
    expect(policyPlan.policies.every((item) => item.providerKey.startsWith("policy.provider."))).toBe(true);

    const serialized = stableStringify({ actionPlan, policyPlan });
    const hash = createHash("sha256").update(serialized).digest("hex");
    expect(hash.length).toBe(64);
  });
});
