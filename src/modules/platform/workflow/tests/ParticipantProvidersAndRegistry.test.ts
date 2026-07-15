import { RuntimeContext } from "@/modules/platform/runtime/application";
import { ParticipantRegistry } from "../services/ParticipantRegistry";
import { UserParticipantProvider } from "../services/participant-providers/UserParticipantProvider";
import { RoleParticipantProvider } from "../services/participant-providers/RoleParticipantProvider";
import { GroupParticipantProvider } from "../services/participant-providers/GroupParticipantProvider";
import { LookupParticipantProvider } from "../services/participant-providers/LookupParticipantProvider";
import { ExpressionParticipantProvider } from "../services/participant-providers/ExpressionParticipantProvider";
import { HierarchyResolver } from "../services/HierarchyResolver";
import { HierarchyParticipantProvider } from "../services/participant-providers/HierarchyParticipantProvider";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

function assignmentContext(overrides: Record<string, unknown> = {}) {
  const snapshot = buildWorkflowSnapshot();
  const runtimeContext = RuntimeContext.create({
    tenantId: snapshot.definition.tenantId,
    organizationId: snapshot.definition.organizationId,
    moduleId: snapshot.definition.moduleId,
    entityId: snapshot.definition.entityId,
    operation: "Submit",
    userId: "U-1",
    roles: ["REVIEWER"],
    permissions: ["Incident.Edit"],
  });

  return {
    workflowDefinitionId: snapshot.definition.id,
    workflowVersionId: snapshot.version.id,
    assignment: {
      ...snapshot.assignments[0],
      participantType: "User",
      targetId: "U-1",
      strategy: "SingleUser",
      priority: 10,
    },
    runtimeContext: runtimeContext.with({}) as any,
    businessObject: { ownerId: "U-2", requesters: ["U-3"] },
    variables: { dynamicUsers: ["U-4", "U-5"] },
    ...overrides,
  };
}

describe("Participant providers and registry", () => {
  test("registry resolves registered providers", () => {
    const registry = new ParticipantRegistry();
    registry.register(new UserParticipantProvider());
    registry.register(new RoleParticipantProvider());

    expect(registry.get("User")?.providerKey).toBe("provider.user");
    expect(registry.get("User")?.capabilities.supportsEligibility).toBe(true);
    expect(registry.get("Role")?.providerKey).toBe("provider.role");
    expect(registry.get("Group")).toBeNull();
  });

  test("registry rejects duplicate participant provider registrations", () => {
    const registry = new ParticipantRegistry();
    registry.register(new UserParticipantProvider());

    expect(() => registry.register(new UserParticipantProvider())).toThrow("Duplicate participant provider registered");
  });

  test("providers resolve participants deterministically", async () => {
    const context = assignmentContext();

    const user = await new UserParticipantProvider().resolve(context as any);
    expect(user[0].participantId).toBe("U-1");

    const role = await new RoleParticipantProvider().resolve(
      assignmentContext({ assignment: { ...context.assignment, assignmentType: "Role", targetId: "REVIEWER" } }) as any
    );
    expect(role[0].participantId).toBe("REVIEWER");

    const group = await new GroupParticipantProvider().resolve(
      assignmentContext({
        assignment: { ...context.assignment, assignmentType: "Group", targetId: "OPS" },
        runtimeContext: { ...(context.runtimeContext as any), groups: ["OPS", "FIN"] },
      }) as any
    );
    expect(group[0].participantId).toBe("OPS");

    const lookup = await new LookupParticipantProvider().resolve(
      assignmentContext({ assignment: { ...context.assignment, assignmentType: "Lookup", lookupKey: "ownerId" } }) as any
    );
    expect(lookup[0].participantId).toBe("U-2");

    const expr = await new ExpressionParticipantProvider().resolve(
      assignmentContext({ assignment: { ...context.assignment, assignmentType: "Expression", expressionId: "dynamicUsers" } }) as any
    );
    expect(expr.map((item) => item.participantId)).toEqual(["U-4", "U-5"]);

    const hierarchy = await new HierarchyParticipantProvider(new HierarchyResolver()).resolve(
      assignmentContext({ runtimeContext: { ...(context.runtimeContext as any), hierarchyChain: ["M-1", "M-2"] } }) as any
    );
    expect(hierarchy.map((item) => item.participantId)).toEqual(["M-1", "M-2"]);
  });
});
