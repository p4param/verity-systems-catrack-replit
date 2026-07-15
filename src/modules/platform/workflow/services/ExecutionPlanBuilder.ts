import { createHash, randomUUID } from "crypto";
import type { IExecutionPlanBuilder } from "../contracts/IExecutionPlanBuilder";
import type {
  ActionPlan,
  EffectResolutionResult,
  ExecutionPlan,
  PolicyPlan,
  WorkflowTransition,
} from "../models/WorkflowModels";

export class ExecutionPlanBuilder implements IExecutionPlanBuilder {
  async build(
    transition: WorkflowTransition,
    actionPlan: ActionPlan,
    policyPlan: PolicyPlan,
    effectResolution: EffectResolutionResult
  ): Promise<ExecutionPlan> {
    const retryMetadata: Record<string, { maxAttempts: number; backoffSeconds: number } | undefined> = {};
    const timeoutMetadata: Record<string, number | undefined> = {};
    const compensationMetadata: Record<string, string | undefined> = {};
    const rollbackMetadata: Record<string, boolean | undefined> = {};

    for (const effect of effectResolution.effectSet.effects) {
      retryMetadata[effect.effectCode] = effect.policyMetadata.retryPolicy;
      timeoutMetadata[effect.effectCode] = effect.policyMetadata.timeoutSeconds;
      compensationMetadata[effect.effectCode] = effect.policyMetadata.compensationActionCode;
      rollbackMetadata[effect.effectCode] = effect.policyMetadata.rollbackOnFailure;
    }

    const deterministicHash = createHash("sha256")
      .update(
        JSON.stringify({
          transitionCode: transition.code,
          orderedEffectCodes: effectResolution.orderedEffectCodes,
          parallelBatches: effectResolution.parallelBatches,
          actionCodes: actionPlan.actions.map((item) => item.actionCode),
          policyCodes: policyPlan.policies.map((item) => item.policyCode),
        })
      )
      .digest("hex");

    return {
      id: randomUUID(),
      workflowVersionId: actionPlan.workflowVersionId,
      transitionCode: transition.code,
      generatedAt: new Date(),
      actionPlan,
      policyPlan,
      runtimeEffectSet: effectResolution.effectSet,
      dependencyGraph: effectResolution.dependencyGraph,
      orderedEffectCodes: effectResolution.orderedEffectCodes,
      parallelBatches: effectResolution.parallelBatches,
      diagnostics: {
        warnings: [],
        errors: [],
        providerDiagnostics: {
          actionProviders: [...new Set(actionPlan.actions.map((action) => action.providerKey))].sort((a, b) =>
            a.localeCompare(b)
          ),
        },
        policyDiagnostics: {
          policyProviders: [...new Set(policyPlan.policies.map((policy) => policy.providerKey))].sort((a, b) =>
            a.localeCompare(b)
          ),
        },
      },
      metadata: {
        deterministicHash,
        retryMetadata,
        timeoutMetadata,
        compensationMetadata,
        rollbackMetadata,
      },
    };
  }
}
