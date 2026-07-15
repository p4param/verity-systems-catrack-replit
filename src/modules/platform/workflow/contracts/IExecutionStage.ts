import type { IExecutionContext } from "./IExecutionContext";
import type { IExecutionResult } from "./IExecutionResult";

export interface IExecutionStage {
  readonly stageId: string;
  readonly order: number;

  execute(
    context: IExecutionContext,
    next: (context: IExecutionContext) => Promise<IExecutionResult>
  ): Promise<IExecutionResult>;
}
