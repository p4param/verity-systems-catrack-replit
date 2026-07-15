import type { RuntimeMiddlewareState } from "@/modules/platform/runtime/application";

export interface IWorkflowMiddleware {
  execute(state: RuntimeMiddlewareState, next: () => Promise<void>): Promise<void>;
}
