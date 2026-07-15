import { AssignmentPlanner } from "../services/AssignmentPlanner";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

describe("Participant runtime model serialization", () => {
  test("assignment plan serializes deterministically", async () => {
    const snapshot = buildWorkflowSnapshot();
    const planner = new AssignmentPlanner();

    const plan = await planner.buildPlan(
      {
        workflowDefinitionId: snapshot.definition.id,
        workflowVersionId: snapshot.version.id,
        assignment: {
          ...snapshot.assignments[0],
          strategy: "SingleUser",
          priority: 5,
          delegationMode: "Allowed",
          escalationTargetId: "U-100",
        },
        runtimeContext: {} as any,
        businessObject: {},
      },
      {
        assignmentId: snapshot.assignments[0].id,
        participants: [
          {
            participantId: "U-1",
            participantType: "User",
            source: "provider.user",
          },
        ],
        requiredParticipants: [
          {
            participantId: "U-1",
            participantType: "User",
            source: "provider.user",
          },
        ],
        optionalParticipants: [],
      },
      {
        assignmentId: snapshot.assignments[0].id,
        strategy: "SingleUser",
        rankedParticipants: [
          {
            participantId: "U-1",
            participantType: "User",
            source: "provider.user",
          },
        ],
        selectedParticipants: [
          {
            participantId: "U-1",
            participantType: "User",
            source: "provider.user",
          },
        ],
        diagnostics: {},
      }
    );

    const payload = JSON.parse(JSON.stringify(plan));

    expect(payload.assignmentId).toBe(snapshot.assignments[0].id);
    expect(payload.strategy).toBe("SingleUser");
    expect(payload.delegationMetadata.mode).toBe("Allowed");
    expect(payload.escalationMetadata.targetParticipantId).toBe("U-100");
  });
});
