import type { IRuntimeEffectGraphBuilder } from "../contracts/IRuntimeEffectGraphBuilder";
import type {
  ActionPlan,
  EffectDependencyGraph,
  EffectGraph,
  EffectGraphEdge,
  PolicyPlan,
} from "../models/WorkflowModels";

function effectCodeFor(transitionCode: string, actionCode: string): string {
  return `${transitionCode}::${actionCode}`;
}

export class RuntimeEffectGraphBuilder implements IRuntimeEffectGraphBuilder {
  build(actionPlan: ActionPlan, policyPlan: PolicyPlan): EffectDependencyGraph {
    const actionGraph = this.buildActionGraph(actionPlan);
    const policyGraph = this.buildPolicyGraph(policyPlan);
    const runtimeEffectGraph = this.buildRuntimeEffectGraph(actionPlan);
    const executionGraph = this.buildExecutionGraph(actionPlan, runtimeEffectGraph);

    return {
      actionGraph,
      policyGraph,
      runtimeEffectGraph,
      executionGraph,
    };
  }

  private buildActionGraph(actionPlan: ActionPlan): EffectGraph {
    const nodes = actionPlan.actions.map((action) => action.actionCode).sort((a, b) => a.localeCompare(b));
    const edges: EffectGraphEdge[] = [];

    for (const action of actionPlan.actions) {
      for (const dependency of action.dependencies) {
        edges.push({ from: dependency, to: action.actionCode, reason: "action-dependency" });
      }
    }

    return { nodes, edges };
  }

  private buildPolicyGraph(policyPlan: PolicyPlan): EffectGraph {
    const ordered = [...policyPlan.policies].sort((a, b) => a.priority - b.priority || a.policyCode.localeCompare(b.policyCode));
    const nodes = ordered.map((policy) => policy.policyCode);
    const edges: EffectGraphEdge[] = [];

    for (let index = 1; index < ordered.length; index += 1) {
      edges.push({
        from: ordered[index - 1].policyCode,
        to: ordered[index].policyCode,
        reason: "policy-priority-order",
      });
    }

    return { nodes, edges };
  }

  private buildRuntimeEffectGraph(actionPlan: ActionPlan): EffectGraph {
    const nodes = actionPlan.actions
      .map((action) => effectCodeFor(actionPlan.transitionCode, action.actionCode))
      .sort((a, b) => a.localeCompare(b));
    const edges: EffectGraphEdge[] = [];

    for (const action of actionPlan.actions) {
      const currentEffect = effectCodeFor(actionPlan.transitionCode, action.actionCode);
      for (const dependency of action.dependencies) {
        edges.push({
          from: effectCodeFor(actionPlan.transitionCode, dependency),
          to: currentEffect,
          reason: "effect-dependency",
        });
      }
    }

    return { nodes, edges };
  }

  private buildExecutionGraph(actionPlan: ActionPlan, runtimeEffectGraph: EffectGraph): EffectGraph {
    const edges = [...runtimeEffectGraph.edges];
    const ordered = [...actionPlan.actions].sort((a, b) => a.sequence - b.sequence || a.actionCode.localeCompare(b.actionCode));

    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      const requiresSequential = previous.parallelMode === "Sequential" || current.parallelMode === "Sequential";
      if (requiresSequential) {
        edges.push({
          from: effectCodeFor(actionPlan.transitionCode, previous.actionCode),
          to: effectCodeFor(actionPlan.transitionCode, current.actionCode),
          reason: "sequential-metadata",
        });
      }
    }

    return {
      nodes: [...runtimeEffectGraph.nodes],
      edges,
    };
  }
}
