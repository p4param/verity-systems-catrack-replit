import { HierarchyResolver } from "../services/HierarchyResolver";
import {
  ExpressionParticipantProvider,
  GroupParticipantProvider,
  HierarchyParticipantProvider,
  LookupParticipantProvider,
  RoleParticipantProvider,
  UserParticipantProvider,
} from "../services/participant-providers";
import type { IParticipantProvider } from "../contracts/IParticipantProvider";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

function context() {
  const snapshot = buildWorkflowSnapshot();
  const runtimeContext = {
    tenantId: snapshot.definition.tenantId,
    organizationId: snapshot.definition.organizationId,
    moduleId: snapshot.definition.moduleId,
    entityId: snapshot.definition.entityId,
    operation: "Submit",
    userId: "U-1",
    roles: ["REVIEWER", "AUDITOR"],
    permissions: ["Incident.Edit"],
    groups: ["OPS", "FIN"],
    hierarchyChain: ["M-1", "M-2"],
  } as any;

  return {
    workflowDefinitionId: snapshot.definition.id,
    workflowVersionId: snapshot.version.id,
    assignment: {
      ...snapshot.assignments[0],
      participantType: "User",
      assignmentType: "User",
      targetId: "U-1",
      expressionId: "dynamicUsers",
      lookupKey: "ownerId",
      priority: 10,
    },
    runtimeContext,
    businessObject: { ownerId: "U-2" },
    variables: { dynamicUsers: ["U-3", "U-4"] },
  };
}

describe("Participant provider contract conformance", () => {
  const providers: IParticipantProvider[] = [
    new UserParticipantProvider(),
    new RoleParticipantProvider(),
    new GroupParticipantProvider(),
    new ExpressionParticipantProvider(),
    new LookupParticipantProvider(),
    new HierarchyParticipantProvider(new HierarchyResolver()),
  ];

  test.each(providers.map((provider) => [provider.providerKey, provider]))(
    "%s is deterministic and side-effect free",
    async (_providerKey, provider) => {
      const ctx = context();
      const before = JSON.stringify(ctx);

      const first = await provider.resolve(ctx as any);
      const second = await provider.resolve(ctx as any);

      expect(first).toEqual(second);
      expect(provider.capabilities.deterministic).toBe(true);
      expect(provider.providerKey.length).toBeGreaterThan(0);
      expect(JSON.stringify(ctx)).toBe(before);
    }
  );
});
