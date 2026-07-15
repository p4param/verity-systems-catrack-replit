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

    const participants = await provider.resolve(context);
    const eligibility = await provider.evaluateEligibility(context, participants);
    const participantSet = provider.toParticipantSet(context.assignment.id, participants, eligibility);
    const strategyResult = await this.strategyEngine.resolveStrategy(context, participantSet);
    const plan = await this.planner.buildPlan(context, participantSet, strategyResult);

    return deepFreeze({
      assignmentId: context.assignment.id,
      participantSet,
      eligibility,
      strategyResult,
      diagnostics: {
        provider: provider.providerKey,
        participantType,
        planId: plan.id,
      },
    });
  }
}
