import type { AssignmentContext } from "../models/WorkflowModels";

export interface IParticipantExpressionEvaluator {
  evaluate(
    expressionKey: string,
    context: AssignmentContext
  ): Promise<string[] | null>;
}
