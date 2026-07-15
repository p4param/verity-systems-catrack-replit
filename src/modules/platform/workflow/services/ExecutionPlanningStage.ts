import type { IExecutionContext } from "../contracts/IExecutionContext";
import type { IExecutionResult } from "../contracts/IExecutionResult";
import type { IExecutionStage } from "../contracts/IExecutionStage";

export class ExecutionPlanningStage implements IExecutionStage {
  readonly stageId = "PreValidation";
  readonly order = 100;

  async execute(
    context: IExecutionContext,
    next: (context: IExecutionContext) => Promise<IExecutionResult>
  ): Promise<IExecutionResult> {
    const executionHash = context.executionPlan.metadata.deterministicHash;
    if (context.executionHash !== executionHash) {
      throw new Error(
        `Execution hash mismatch for plan ${context.executionPlan.id}.`
      );
    }

    const result = await next(context);

    return {
      ...result,
      diagnostics: {
        ...result.diagnostics,
        preValidation: {
          executionRequested: context.executionRequested,
          executionHash,
        },
      },
      stageResults: [
        {
          stageId: this.stageId,
          status: context.executionRequested ? result.status : "Planned",
          executedEffectCodes: [],
          deferredEffectCodes: [...context.executionPlan.orderedEffectCodes],
          diagnostics: {
            effectCount: context.executionPlan.orderedEffectCodes.length,
            executionRequested: context.executionRequested,
          },
        },
        ...result.stageResults,
      ],
    };
  }
}
