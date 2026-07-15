import type { RuntimeContext } from "../models/RuntimeContext";
import type { RuntimeOperationResult } from "../models/RuntimeOperationResult";
import type {
  MiddlewareExecutionPolicy,
  RuntimeMiddleware,
  RuntimeMiddlewareRegistration,
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

  registerMiddleware(
    nameOrRegistration: string | RuntimeMiddlewareRegistration,
    middleware?: RuntimeMiddleware,
    options?: {
      order?: number;
      priority?: number;
      enabled?: boolean;
      dependencies?: string[];
      policy?: MiddlewareExecutionPolicy;
    }
  ): void;
  registerAction(operation: RuntimeOperation, action: RuntimeOperationAction): void;
  registerValidator(name: string, validator: RuntimeValidator): void;
  registerRule(name: string, rule: RuntimeRule): void;
  registerWorkflow(name: string, workflow: RuntimeWorkflow): void;
}
