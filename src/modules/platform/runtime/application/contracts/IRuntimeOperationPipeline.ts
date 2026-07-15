import type { RuntimeContext } from "../models/RuntimeContext";
import type { RuntimeOperationResult } from "../models/RuntimeOperationResult";
import type {
  RuntimeMiddleware,
  RuntimeOperationAction,
  RuntimeRule,
  RuntimeValidator,
  RuntimeWorkflow,
} from "../pipeline/RuntimeMiddleware";
import type { RuntimeOperation } from "../models/RuntimeOperation";

export interface IRuntimeOperationPipeline {
  execute<TInput = unknown, TRecord = unknown>(
    context: RuntimeContext,
    input?: TInput
  ): Promise<RuntimeOperationResult<TRecord>>;

  registerMiddleware(name: string, middleware: RuntimeMiddleware): void;
  registerAction(operation: RuntimeOperation, action: RuntimeOperationAction): void;
  registerValidator(name: string, validator: RuntimeValidator): void;
  registerRule(name: string, rule: RuntimeRule): void;
  registerWorkflow(name: string, workflow: RuntimeWorkflow): void;
}
