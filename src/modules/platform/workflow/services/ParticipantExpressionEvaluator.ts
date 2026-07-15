import type { IParticipantExpressionEvaluator } from "../contracts/IParticipantExpressionEvaluator";
import type { AssignmentContext } from "../models/WorkflowModels";

export class ParticipantExpressionEvaluator implements IParticipantExpressionEvaluator {
  async evaluate(
    expressionKey: string,
    context: AssignmentContext
  ): Promise<string[] | null> {
    const variableValue = context.variables?.[expressionKey];
    const objectValue = context.businessObject[expressionKey];
    const resolved = variableValue ?? objectValue;

    if (resolved === null || resolved === undefined) {
      return null;
    }

    if (Array.isArray(resolved)) {
      return resolved.map((item) => String(item));
    }

    return [String(resolved)];
  }
}
