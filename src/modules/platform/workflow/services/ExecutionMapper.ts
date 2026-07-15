import type { IExecutionMapper } from "../contracts/IExecutionMapper";
import type { IExecutionContext } from "../contracts/IExecutionContext";
import type { RuntimeOperationRequest } from "../contracts/IRuntimeOperationRequest";
import type { ExecutionPlan, RuntimeEffect } from "../models/WorkflowModels";

function resolveOperation(effect: RuntimeEffect): RuntimeOperationRequest["operation"] | null {
  const candidate = effect.metadata?.runtimeOperation;
  if (typeof candidate === "string") {
    return candidate as RuntimeOperationRequest["operation"];
  }

  const fallback = effect.metadata?.operation;
  if (typeof fallback === "string") {
    return fallback as RuntimeOperationRequest["operation"];
  }

  return null;
}

export class ExecutionMapper implements IExecutionMapper {
  map(plan: ExecutionPlan, context: IExecutionContext): RuntimeOperationRequest[] {
    return plan.runtimeEffectSet.effects
      .map((effect) => {
        const operation = resolveOperation(effect);
        if (!operation) {
          return null;
        }

        return {
          executionPlanId: plan.id,
          executionHash: context.executionHash,
          correlationId: context.correlationId,
          effectCode: effect.effectCode,
          effectType: effect.effectType,
          operation,
          runtimeContext: context.runtimeContext,
          runtimeTransaction: context.runtimeTransaction,
          payload: (effect.metadata?.payload as Record<string, unknown> | undefined) ?? {},
          metadata: {
            ...(effect.metadata ?? {}),
          },
        } satisfies RuntimeOperationRequest;
      })
      .filter((request): request is RuntimeOperationRequest => request !== null);
  }
}