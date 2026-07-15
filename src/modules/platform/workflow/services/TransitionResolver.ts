import type { ITransitionResolver } from "../contracts/ITransitionResolver";
import type {
  WorkflowRuntimeModel,
  WorkflowTransitionCandidate,
  WorkflowTransitionResolutionContext,
  WorkflowTransitionResolutionResult,
} from "../models/WorkflowModels";

function upper(values: string[]): Set<string> {
  return new Set(values.map((item) => item.toUpperCase()));
}

export class TransitionResolver implements ITransitionResolver {
  resolveTransitions(
    runtimeModel: WorkflowRuntimeModel,
    currentStateCode: string,
    context: WorkflowTransitionResolutionContext = {}
  ): WorkflowTransitionResolutionResult {
    const conditionOutcomes = context.conditionOutcomes ?? {};
    const grantedPermissions = upper(context.grantedPermissions ?? []);

    const sourceKey = Object.keys(runtimeModel.runtimeGraph.transitionGraph.transitionsBySourceState).find(
      (item) => item.toUpperCase() === currentStateCode.toUpperCase()
    );
    const edges = sourceKey
      ? runtimeModel.runtimeGraph.transitionGraph.transitionsBySourceState[sourceKey]
      : [];

    const candidates: WorkflowTransitionCandidate[] = edges
      .sort((a, b) => a.priority - b.priority)
      .map((edge) => {
        const reasons: string[] = [];
        const requiredConditions = edge.conditionId ? [edge.conditionId] : [];
        const requiredPermissions = edge.permissionCode ? [edge.permissionCode] : [];

        if (edge.conditionId) {
          const conditionValue = conditionOutcomes[edge.conditionId];
          if (conditionValue !== true) {
            reasons.push(`Condition ${edge.conditionId} is not satisfied.`);
          }
        }

        if (edge.permissionCode && !grantedPermissions.has(edge.permissionCode.toUpperCase())) {
          reasons.push(`Permission ${edge.permissionCode} is required.`);
        }

        return {
          transition: edge,
          allowed: reasons.length === 0,
          reasons,
          requiredConditions,
          requiredPermissions,
        };
      });

    const selected = candidates.find((item) => item.allowed)?.transition;

    return {
      canMove: Boolean(selected),
      currentStateCode,
      availableTransitions: candidates,
      selectedTransition: selected,
      nextStateCode: selected?.to,
    };
  }
}
