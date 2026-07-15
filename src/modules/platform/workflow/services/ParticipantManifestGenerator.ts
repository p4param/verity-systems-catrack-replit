import type { IParticipantManifestGenerator } from "../contracts/IParticipantManifestGenerator";
import type {
  AssignmentManifest,
  ParticipantManifest,
  ResolutionManifest,
  WorkflowMetadataSnapshot,
  WorkflowRuntimeModel,
} from "../models/WorkflowModels";

export class ParticipantManifestGenerator implements IParticipantManifestGenerator {
  async generateParticipantManifest(snapshot: WorkflowMetadataSnapshot): Promise<ParticipantManifest> {
    const providerMap: Record<string, string> = {};

    for (const assignment of snapshot.assignments) {
      const participantType = assignment.participantType ?? assignment.assignmentType;
      providerMap[assignment.id] = `provider.${participantType.toLowerCase()}`;
    }

    return {
      workflowVersionId: snapshot.version.id,
      generatedAt: new Date(),
      providerMap,
      supportedParticipantTypes: Array.from(
        new Set(snapshot.assignments.map((assignment) => assignment.participantType ?? assignment.assignmentType))
      ),
    };
  }

  async generateAssignmentManifest(snapshot: WorkflowMetadataSnapshot): Promise<AssignmentManifest> {
    return {
      workflowVersionId: snapshot.version.id,
      generatedAt: new Date(),
      strategies: snapshot.assignments.map((assignment) => ({
        assignmentId: assignment.id,
        strategy: assignment.strategy ?? "SingleUser",
        priority: assignment.priority ?? assignment.sequence,
        strategySeed: assignment.strategySeed,
        strategyWeights: assignment.strategyWeights,
        ruleSet: assignment.ruleSet,
      })),
    };
  }

  async generateResolutionManifest(
    snapshot: WorkflowMetadataSnapshot,
    _runtimeModel: WorkflowRuntimeModel
  ): Promise<ResolutionManifest> {
    return {
      workflowVersionId: snapshot.version.id,
      generatedAt: new Date(),
      assignments: snapshot.assignments.map((assignment) => {
        const participantType = assignment.participantType ?? assignment.assignmentType;
        return {
          assignmentId: assignment.id,
          participantType,
          strategy: assignment.strategy ?? "SingleUser",
          providerKey: `provider.${participantType.toLowerCase()}`,
        };
      }),
    };
  }
}
