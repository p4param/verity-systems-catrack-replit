import type { IParticipantManifestGenerator } from "../contracts/IParticipantManifestGenerator";
import type {
  AssignmentManifest,
  ParticipantManifest,
  ResolutionManifest,
  WorkflowMetadataSnapshot,
  WorkflowRuntimeModel,
} from "../models/WorkflowModels";

function resolveGeneratedAt(snapshot: WorkflowMetadataSnapshot): Date {
  return snapshot.version.publishedAt ?? snapshot.version.updatedAt ?? snapshot.version.createdAt;
}

export class ParticipantManifestGenerator implements IParticipantManifestGenerator {
  async generateParticipantManifest(snapshot: WorkflowMetadataSnapshot): Promise<ParticipantManifest> {
    const generatedAt = resolveGeneratedAt(snapshot);
    const providerMap: Record<string, string> = {};

    for (const assignment of snapshot.assignments) {
      const participantType = assignment.participantType ?? assignment.assignmentType;
      providerMap[assignment.id] = `provider.${participantType.toLowerCase()}`;
    }

    return {
      workflowVersionId: snapshot.version.id,
      generatedAt,
      providerMap,
      supportedParticipantTypes: Array.from(
        new Set(snapshot.assignments.map((assignment) => assignment.participantType ?? assignment.assignmentType))
      ),
    };
  }

  async generateAssignmentManifest(snapshot: WorkflowMetadataSnapshot): Promise<AssignmentManifest> {
    const generatedAt = resolveGeneratedAt(snapshot);
    return {
      workflowVersionId: snapshot.version.id,
      generatedAt,
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
    const generatedAt = resolveGeneratedAt(snapshot);
    return {
      workflowVersionId: snapshot.version.id,
      generatedAt,
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
