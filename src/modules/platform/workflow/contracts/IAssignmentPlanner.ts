import type {
  AssignmentContext,
  AssignmentPlan,
  AssignmentStrategyResult,
  ParticipantSet,
} from "../models/WorkflowModels";

export interface IAssignmentPlanner {
  buildPlan(
    context: AssignmentContext,
    participantSet: ParticipantSet,
    strategyResult: AssignmentStrategyResult
  ): Promise<AssignmentPlan>;
}
