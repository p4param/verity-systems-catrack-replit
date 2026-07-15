import type {
  AssignmentContext,
  ParticipantResolutionResult,
} from "../models/WorkflowModels";

export interface IParticipantResolutionEngine {
  resolve(context: AssignmentContext): Promise<ParticipantResolutionResult>;
}
