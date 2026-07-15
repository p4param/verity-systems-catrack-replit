import type { IHierarchyResolver } from "../contracts/IHierarchyResolver";
import type { IParticipantRegistry } from "../contracts/IParticipantRegistry";
import type { IParticipantValidator } from "../contracts/IParticipantValidator";
import type {
  WorkflowMetadataSnapshot,
  WorkflowValidationIssue,
} from "../models/WorkflowModels";

export class ParticipantValidator implements IParticipantValidator {
  constructor(
    private readonly registry: IParticipantRegistry,
    private readonly hierarchyResolver: IHierarchyResolver
  ) {}

  async validate(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowValidationIssue[]> {
    const issues: WorkflowValidationIssue[] = [];
    const participantKeys = new Set<string>();
    const priorityBySequence = new Map<number, string>();

    for (const assignment of snapshot.assignments) {
      const participantType = assignment.participantType ?? assignment.assignmentType;
      const key = `${assignment.code}|${participantType}|${assignment.targetId ?? ""}`.toUpperCase();
      if (participantKeys.has(key)) {
        issues.push({
          code: "WF_DUPLICATE_PARTICIPANT",
          message: `Duplicate participant mapping detected for assignment ${assignment.code}.`,
          severity: "Error",
          path: `assignments.${assignment.code}`,
        });
      }
      participantKeys.add(key);

      const provider = this.registry.get(participantType);
      if (!provider) {
        issues.push({
          code: "WF_MISSING_PROVIDER",
          message: `No participant provider is registered for ${participantType}.`,
          severity: "Error",
          path: `assignments.${assignment.code}`,
        });
      }

      if (assignment.strategy && assignment.strategy === "Custom" && !assignment.targetId) {
        issues.push({
          code: "WF_INVALID_STRATEGY",
          message: `Custom strategy for ${assignment.code} requires a targetId/provider key.`,
          severity: "Error",
          path: `assignments.${assignment.code}`,
        });
      }

      if (assignment.priority !== undefined) {
        if (priorityBySequence.has(assignment.priority)) {
          issues.push({
            code: "WF_DUPLICATE_PRIORITY",
            message: `Duplicate assignment priority ${assignment.priority}.`,
            severity: "Error",
            path: `assignments.${assignment.code}`,
          });
        }
        priorityBySequence.set(assignment.priority, assignment.code);
      }

      if (assignment.delegationMode === "Required" && !assignment.targetId && !assignment.lookupKey) {
        issues.push({
          code: "WF_INVALID_DELEGATION",
          message: `Assignment ${assignment.code} requires delegate source metadata.`,
          severity: "Error",
          path: `assignments.${assignment.code}`,
        });
      }

      if (assignment.escalationTargetId === "") {
        issues.push({
          code: "WF_MISSING_ESCALATION_TARGET",
          message: `Assignment ${assignment.code} has invalid escalation target.`,
          severity: "Error",
          path: `assignments.${assignment.code}`,
        });
      }
    }

    if (snapshot.assignments.length > 0) {
      const hierarchyContext = {
        workflowDefinitionId: snapshot.definition.id,
        workflowVersionId: snapshot.version.id,
        assignment: snapshot.assignments[0],
        runtimeContext: {
          hierarchyChain: snapshot.assignments.map((item) => item.targetId).filter(Boolean),
        } as any,
        businessObject: {},
      };

      if (await this.hierarchyResolver.hasCircularHierarchy(hierarchyContext)) {
      issues.push({
        code: "WF_CIRCULAR_HIERARCHY",
        message: "Circular hierarchy detected in participant metadata.",
        severity: "Error",
      });
    }
    }

    return issues;
  }
}
