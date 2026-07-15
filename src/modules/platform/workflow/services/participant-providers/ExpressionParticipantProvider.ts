import type { IExpressionParticipantProvider } from "../../contracts/IParticipantProvider";
import type { IParticipantExpressionEvaluator } from "../../contracts/IParticipantExpressionEvaluator";
import type { AssignmentContext, ResolvedParticipant } from "../../models/WorkflowModels";
import { ParticipantExpressionEvaluator } from "../ParticipantExpressionEvaluator";
import { BaseParticipantProvider } from "./BaseParticipantProvider";

export class ExpressionParticipantProvider
  extends BaseParticipantProvider
  implements IExpressionParticipantProvider
{
  constructor(
    private readonly evaluator: IParticipantExpressionEvaluator = new ParticipantExpressionEvaluator()
  ) {
    super("Expression", "provider.expression");
  }

  async resolve(context: AssignmentContext): Promise<ResolvedParticipant[]> {
    const expression = context.assignment.expressionId ?? context.assignment.targetId;
    if (!expression) {
      return [];
    }

    const resolved = await this.evaluator.evaluate(expression, context);

    if (!resolved) {
      return [];
    }

    const values = resolved;

    return values.map((value, index) => ({
      participantId: value,
      participantType: "Expression",
      source: this.providerKey,
      priority: (context.assignment.priority ?? 100) + index,
    }));
  }
}
