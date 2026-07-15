import type {
  AssignmentContext,
  ParticipantEligibilityResult,
  ParticipantSet,
  ResolvedParticipant,
} from "../models/WorkflowModels";
import type { WorkflowParticipantType } from "../models/WorkflowModels";

export interface ParticipantProviderCapabilities {
  supportsEligibility: boolean;
  supportsHierarchy: boolean;
  supportsDelegation: boolean;
  deterministic: boolean;
}

export interface IParticipantProvider {
  readonly participantType: WorkflowParticipantType;
  readonly providerKey: string;
  readonly capabilities: ParticipantProviderCapabilities;

  resolve(context: AssignmentContext): Promise<ResolvedParticipant[]>;
  evaluateEligibility(
    context: AssignmentContext,
    participants: ResolvedParticipant[]
  ): Promise<ParticipantEligibilityResult>;
  toParticipantSet(
    assignmentId: string,
    participants: ResolvedParticipant[],
    eligibility: ParticipantEligibilityResult
  ): ParticipantSet;
}

export interface IUserParticipantProvider extends IParticipantProvider {}
export interface IRoleParticipantProvider extends IParticipantProvider {}
export interface IGroupParticipantProvider extends IParticipantProvider {}
export interface IExpressionParticipantProvider extends IParticipantProvider {}
export interface ILookupParticipantProvider extends IParticipantProvider {}
export interface IHierarchyParticipantProvider extends IParticipantProvider {}
export interface ICustomParticipantProvider extends IParticipantProvider {}
