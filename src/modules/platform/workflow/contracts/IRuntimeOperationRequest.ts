import type { RuntimeContext } from "@/modules/platform/runtime/application/models/RuntimeContext";
import type { RuntimeTransaction } from "@/modules/platform/runtime/application/models/RuntimeTransaction";
import type { RuntimeOperation } from "@/modules/platform/runtime/application/models/RuntimeOperation";

export interface RuntimeOperationRequest {
  readonly executionPlanId: string;
  readonly executionHash: string;
  readonly correlationId: string;
  readonly effectCode: string;
  readonly effectType: string;
  readonly operation: RuntimeOperation;
  readonly runtimeContext: RuntimeContext;
  readonly runtimeTransaction: RuntimeTransaction;
  readonly payload: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
}