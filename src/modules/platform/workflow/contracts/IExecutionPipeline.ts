import type { IExecutionContext } from "./IExecutionContext";
import type { IExecutionResult } from "./IExecutionResult";
import type { IExecutionStage } from "./IExecutionStage";

export interface IExecutionPipeline {
  registerStage(stage: IExecutionStage): void;
  getStages(): readonly IExecutionStage[];
  execute(context: IExecutionContext): Promise<IExecutionResult>;
}
