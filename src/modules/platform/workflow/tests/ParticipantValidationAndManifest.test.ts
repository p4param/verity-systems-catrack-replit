import { HierarchyResolver } from "../services/HierarchyResolver";
import { ParticipantManifestGenerator } from "../services/ParticipantManifestGenerator";
import { ParticipantRegistry } from "../services/ParticipantRegistry";
import { ParticipantValidator } from "../services/ParticipantValidator";
import { RoleParticipantProvider } from "../services/participant-providers/RoleParticipantProvider";
import { StateMachineEngine } from "../services/StateMachineEngine";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

describe("Participant validation and manifest generation", () => {
  test("validates duplicate participants and missing providers", async () => {
    const snapshot = buildWorkflowSnapshot();
    snapshot.assignments.push({
      ...snapshot.assignments[0],
      id: crypto.randomUUID(),
      code: snapshot.assignments[0].code,
      participantType: "Role",
      targetId: snapshot.assignments[0].targetId,
      priority: 1,
    });
    snapshot.assignments[0].participantType = "Role";
    snapshot.assignments[0].priority = 1;

    const registry = new ParticipantRegistry();
    const validator = new ParticipantValidator(registry, new HierarchyResolver());
    const issues = await validator.validate(snapshot);

    expect(issues.some((item) => item.code === "WF_DUPLICATE_PARTICIPANT")).toBe(true);
    expect(issues.some((item) => item.code === "WF_MISSING_PROVIDER")).toBe(true);
    expect(issues.some((item) => item.code === "WF_DUPLICATE_PRIORITY")).toBe(true);
  });

  test("generates participant manifests for runtime artifacts", async () => {
    const snapshot = buildWorkflowSnapshot();
    snapshot.assignments[0].participantType = "Role";
    snapshot.assignments[0].strategy = "AnyUser";

    const runtimeModel = await new StateMachineEngine().buildRuntimeModel(snapshot);
    const generator = new ParticipantManifestGenerator();

    const participantManifest = await generator.generateParticipantManifest(snapshot);
    const assignmentManifest = await generator.generateAssignmentManifest(snapshot);
    const resolutionManifest = await generator.generateResolutionManifest(snapshot, runtimeModel);

    expect(participantManifest.providerMap[snapshot.assignments[0].id]).toBe("provider.role");
    expect(assignmentManifest.strategies[0].strategy).toBe("AnyUser");
    expect(resolutionManifest.assignments[0].participantType).toBe("Role");
  });

  test("hierarchy resolver detects circular hierarchy", async () => {
    const snapshot = buildWorkflowSnapshot();
    const resolver = new HierarchyResolver();

    const hasCircular = await resolver.hasCircularHierarchy({
      workflowDefinitionId: snapshot.definition.id,
      workflowVersionId: snapshot.version.id,
      assignment: snapshot.assignments[0],
      runtimeContext: { hierarchyChain: ["A", "B", "A"] } as any,
      businessObject: {},
    });

    expect(hasCircular).toBe(true);
  });

  test("validator passes when provider exists", async () => {
    const snapshot = buildWorkflowSnapshot();
    snapshot.assignments[0].participantType = "Role";
    snapshot.assignments[0].priority = 3;

    const registry = new ParticipantRegistry();
    registry.register(new RoleParticipantProvider());

    const issues = await new ParticipantValidator(registry, new HierarchyResolver()).validate(snapshot);

    expect(issues.length).toBe(0);
  });
});
