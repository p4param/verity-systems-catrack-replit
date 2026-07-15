import type { IAssignmentPlanner } from "../contracts/IAssignmentPlanner";
import type { IAssignmentStrategyEngine } from "../contracts/IAssignmentStrategyEngine";
import type { IParticipantRegistry } from "../contracts/IParticipantRegistry";
import type { IParticipantResolutionEngine } from "../contracts/IParticipantResolutionEngine";
import type {
  AssignmentContext,
  ParticipantResolutionResult,
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

function normalizeParticipants<T extends { participantId: string; participantType: string; source: string; priority?: number }>(
  participants: T[]
): T[] {
  const seen = new Map<string, T>();
  for (const participant of participants) {
    const key = `${participant.participantId}|${participant.participantType}|${participant.source}`.toUpperCase();
    if (!seen.has(key)) {
      seen.set(key, participant);
    }
  }

  return [...seen.values()].sort((left, right) => {
    const byPriority = (left.priority ?? 100) - (right.priority ?? 100);
    if (byPriority !== 0) {
      return byPriority;
    }

    const byType = left.participantType.localeCompare(right.participantType);
    if (byType !== 0) {
      return byType;
    }

    return left.participantId.localeCompare(right.participantId);
  });
}

export class ParticipantResolutionEngine implements IParticipantResolutionEngine {
  constructor(
    private readonly registry: IParticipantRegistry,
    private readonly strategyEngine: IAssignmentStrategyEngine,
    private readonly planner: IAssignmentPlanner
  ) {}

  async resolve(context: AssignmentContext): Promise<ParticipantResolutionResult> {
    const participantType = context.assignment.participantType ?? context.assignment.assignmentType;
    const provider = this.registry.get(participantType);

    if (!provider) {
      throw new Error(`No participant provider registered for type ${participantType}.`);
    }

    const participants = normalizeParticipants(await provider.resolve(context));
    const eligibility = await provider.evaluateEligibility(context, participants);
    const normalizedEligibility = {
      ...eligibility,
      eligibleParticipants: normalizeParticipants(eligibility.eligibleParticipants),
      ineligibleParticipants: [...eligibility.ineligibleParticipants].sort((left, right) =>
        left.participant.participantId.localeCompare(right.participant.participantId)
      ),
    };
    const participantSet = provider.toParticipantSet(context.assignment.id, participants, normalizedEligibility);
    const strategyResult = await this.strategyEngine.resolveStrategy(context, participantSet);
    const plan = await this.planner.buildPlan(context, participantSet, strategyResult);

    return deepFreeze({
      assignmentId: context.assignment.id,
      participantSet,
      eligibility: normalizedEligibility,
      strategyResult,
      diagnostics: {
        provider: provider.providerKey,
        participantType,
        planId: plan.id,
      },
    });
  }
}
