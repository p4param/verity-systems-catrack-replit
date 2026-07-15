import type { IParticipantProvider } from "../../contracts/IParticipantProvider";
import type { ParticipantProviderCapabilities } from "../../contracts/IParticipantProvider";
import type {
  AssignmentContext,
  ParticipantEligibilityResult,
  ParticipantSet,
  ResolvedParticipant,
  WorkflowParticipantType,
} from "../../models/WorkflowModels";

export abstract class BaseParticipantProvider implements IParticipantProvider {
  public readonly capabilities: ParticipantProviderCapabilities = {
    supportsEligibility: true,
    supportsHierarchy: false,
    supportsDelegation: false,
    deterministic: true,
  };

  constructor(
    public readonly participantType: WorkflowParticipantType,
    public readonly providerKey: string
  ) {}

  abstract resolve(context: AssignmentContext): Promise<ResolvedParticipant[]>;

  async evaluateEligibility(
    context: AssignmentContext,
    participants: ResolvedParticipant[]
  ): Promise<ParticipantEligibilityResult> {
    const eligibleParticipants = participants.filter((participant) => !!participant.participantId);
    const ineligibleParticipants = participants
      .filter((participant) => !participant.participantId)
      .map((participant) => ({
        participant,
        reason: `Participant from ${this.providerKey} has empty id.`,
      }));

    return {
      assignmentId: context.assignment.id,
      eligibleParticipants,
      ineligibleParticipants,
    };
  }

  toParticipantSet(
    assignmentId: string,
    participants: ResolvedParticipant[],
    eligibility: ParticipantEligibilityResult
  ): ParticipantSet {
    const requiredIds = new Set(eligibility.eligibleParticipants.map((item) => item.participantId));

    return {
      assignmentId,
      participants,
      requiredParticipants: participants.filter((item) => requiredIds.has(item.participantId)),
      optionalParticipants: participants.filter((item) => !requiredIds.has(item.participantId)),
    };
  }
}
