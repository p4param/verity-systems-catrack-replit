import type {
  AssignmentContext,
  ResolvedParticipant,
} from "../models/WorkflowModels";

export interface IHierarchyResolver {
  resolveHierarchy(context: AssignmentContext): Promise<ResolvedParticipant[]>;
  hasCircularHierarchy(context: AssignmentContext): Promise<boolean>;
}
