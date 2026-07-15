import type { RuntimeOperation } from "@/modules/platform/runtime/application/models/RuntimeOperation";
import type { RuntimeOperationResult } from "@/modules/platform/runtime/application/models/RuntimeOperationResult";

export interface RuntimeOperationResponse {
  readonly effectCode: string;
  readonly operation: RuntimeOperation;
  readonly success: boolean;
  readonly runtimeOperationResult?: RuntimeOperationResult<unknown>;
}