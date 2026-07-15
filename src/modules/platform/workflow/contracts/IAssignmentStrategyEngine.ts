import type {
  AssignmentContext,
  AssignmentStrategyResult,
  ParticipantSet,
} from "../models/WorkflowModels";

export interface IAssignmentStrategyEngine {
  resolveStrategy(context: AssignmentContext, participantSet: ParticipantSet): Promise<AssignmentStrategyResult>;
}
