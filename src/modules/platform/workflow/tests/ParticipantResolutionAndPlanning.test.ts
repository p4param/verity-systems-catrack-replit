import { RuntimeContext } from "@/modules/platform/runtime/application";
import { AssignmentPlanner } from "../services/AssignmentPlanner";
import { AssignmentStrategyEngine } from "../services/AssignmentStrategyEngine";
import { ParticipantRegistry } from "../services/ParticipantRegistry";
import { ParticipantResolutionEngine } from "../services/ParticipantResolutionEngine";
import { RoleParticipantProvider } from "../services/participant-providers/RoleParticipantProvider";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

function context() {
  const snapshot = buildWorkflowSnapshot();
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
  };
}

describe("Participant resolution and assignment planning", () => {
  test("builds deterministic participant resolution result", async () => {
    const registry = new ParticipantRegistry();
    registry.register(new RoleParticipantProvider());

    const engine = new ParticipantResolutionEngine(
      registry,
      new AssignmentStrategyEngine(),
      new AssignmentPlanner()
    );

    const result = await engine.resolve(context() as any);

    expect(result.assignmentId).toBeDefined();
    expect(result.participantSet.participants.length).toBe(1);
    expect(result.strategyResult.strategy).toBe("Priority");
    expect(Object.isFrozen(result)).toBe(true);
  });

  test("throws when provider is missing", async () => {
    const engine = new ParticipantResolutionEngine(
      new ParticipantRegistry(),
      new AssignmentStrategyEngine(),
      new AssignmentPlanner()
    );

    await expect(engine.resolve(context() as any)).rejects.toThrow("No participant provider registered");
  });

  test("uses deterministic seed for random strategy", async () => {
    const strategy = new AssignmentStrategyEngine();
    const ctx = context();
    ctx.assignment.strategy = "Random";
    ctx.assignment.strategySeed = "seed-123";

    const participantSet = {
      assignmentId: ctx.assignment.id,
      participants: [
        { participantId: "A", participantType: "Role", source: "provider.role", priority: 1 },
        { participantId: "B", participantType: "Role", source: "provider.role", priority: 2 },
      ],
      requiredParticipants: [
        { participantId: "A", participantType: "Role", source: "provider.role", priority: 1 },
        { participantId: "B", participantType: "Role", source: "provider.role", priority: 2 },
      ],
      optionalParticipants: [],
    };

    const first = await strategy.resolveStrategy(ctx as any, participantSet as any);
    const second = await strategy.resolveStrategy(ctx as any, participantSet as any);

    expect(first.selectedParticipants).toEqual(second.selectedParticipants);
    expect(first.strategySeed).toBe("seed-123");
  });

  test("uses deterministic seed for weighted strategy", async () => {
    const strategy = new AssignmentStrategyEngine();
    const ctx = context();
    ctx.assignment.strategy = "Weighted";
    ctx.assignment.strategySeed = "seed-weighted";
    ctx.assignment.strategyWeights = { A: 10, B: 1 };

    const participantSet = {
      assignmentId: ctx.assignment.id,
      participants: [
        { participantId: "A", participantType: "Role", source: "provider.role", priority: 1 },
        { participantId: "B", participantType: "Role", source: "provider.role", priority: 2 },
      ],
      requiredParticipants: [
        { participantId: "A", participantType: "Role", source: "provider.role", priority: 1 },
        { participantId: "B", participantType: "Role", source: "provider.role", priority: 2 },
      ],
      optionalParticipants: [],
    };

    const result = await strategy.resolveStrategy(ctx as any, participantSet as any);
    expect(result.selectedParticipants).toHaveLength(1);
    expect(result.strategySeed).toBe("seed-weighted");
  });
});
