import { randomUUID } from "crypto";
import type { IAssignmentPlanner } from "../contracts/IAssignmentPlanner";
import type {
  AssignmentContext,
  AssignmentPlan,
  AssignmentStrategyResult,
  ParticipantSet,
} from "../models/WorkflowModels";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const child = (value as Record<string, unknown>)[key];
      if (child && typeof child === "object" && !Object.isFrozen(child)) {
        deepFreeze(child);
      }
    }
  }
  return value;
}

export class AssignmentPlanner implements IAssignmentPlanner {
  async buildPlan(
    context: AssignmentContext,
    participantSet: ParticipantSet,
    strategyResult: AssignmentStrategyResult
  ): Promise<AssignmentPlan> {
    const plan: AssignmentPlan = {
      id: randomUUID(),
      assignmentId: context.assignment.id,
      participantSet,
      strategy: strategyResult.strategy,
      priority: context.assignment.priority ?? context.assignment.sequence,
      escalationMetadata: context.assignment.escalationTargetId
        ? {
            targetParticipantId: context.assignment.escalationTargetId,
            mode: "Configured",
          }
        : undefined,
      delegationMetadata: {
        mode: context.assignment.delegationMode ?? "None",
      },
      slaMetadata: undefined,
      generatedAt: new Date(),
      version: 1,
    };

    return deepFreeze(plan);
  }
}
