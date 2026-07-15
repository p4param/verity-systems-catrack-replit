import type { RuntimeMiddlewareState } from "@/modules/platform/runtime/application/pipeline/RuntimeMiddleware";

export interface IWorkflowMiddleware {
  execute(state: RuntimeMiddlewareState, next: () => Promise<void>): Promise<void>;
}
