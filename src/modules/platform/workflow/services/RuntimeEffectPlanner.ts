import type { IRuntimeEffectGraphBuilder } from "../contracts/IRuntimeEffectGraphBuilder";
import type { IRuntimeEffectPlanner } from "../contracts/IRuntimeEffectPlanner";
import type {
  ActionPlan,
  EffectGraph,
  EffectGraphEdge,
  EffectResolutionResult,
  PolicyPlan,
  RuntimeEffect,
  RuntimeEffectPolicyMetadata,
  WorkflowMetadataSnapshot,
  WorkflowTransition,
} from "../models/WorkflowModels";

function effectCodeFor(transitionCode: string, actionCode: string): string {
  return `${transitionCode}::${actionCode}`;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export class RuntimeEffectPlanner implements IRuntimeEffectPlanner {
  constructor(private readonly graphBuilder: IRuntimeEffectGraphBuilder) {}

  async plan(
    snapshot: WorkflowMetadataSnapshot,
    transition: WorkflowTransition,
    actionPlan: ActionPlan,
    policyPlan: PolicyPlan
  ): Promise<EffectResolutionResult> {
    const dependencyGraph = this.graphBuilder.build(actionPlan, policyPlan);
    const effects = this.buildEffects(snapshot, transition, actionPlan, policyPlan);
    const { ordered, batches } = this.topologicalOrder(dependencyGraph.executionGraph);

    return {
      effectSet: {
        workflowVersionId: snapshot.version.id,
        transitionCode: transition.code,
        generatedAt: new Date(),
        effects,
      },
      dependencyGraph,
      orderedEffectCodes: ordered,
      parallelBatches: batches,
    };
  }

  private buildEffects(
    snapshot: WorkflowMetadataSnapshot,
    transition: WorkflowTransition,
    actionPlan: ActionPlan,
    policyPlan: PolicyPlan
  ): RuntimeEffect[] {
    const effects: RuntimeEffect[] = [];

    for (const action of actionPlan.actions) {
      const policyMetadata = this.resolvePolicyMetadata(action.actionCode, action.policyMetadata, policyPlan);
      const payload = action.payload ?? {};
      const runtimeOperation =
        typeof payload.runtimeOperation === "string" ? payload.runtimeOperation : undefined;
      effects.push({
        effectCode: effectCodeFor(transition.code, action.actionCode),
        effectType: action.actionType,
        actionCode: action.actionCode,
        dependencies: action.dependencies.map((dependency) => effectCodeFor(transition.code, dependency)),
        priority: action.priority,
        parallelizable: action.parallelMode !== "Sequential",
        policyMetadata,
        metadata: {
          workflowVersionId: snapshot.version.id,
          providerKey: action.providerKey,
          ...(runtimeOperation ? { runtimeOperation } : {}),
          payload,
        },
      });
    }

    return effects.sort((a, b) => a.priority - b.priority || a.effectCode.localeCompare(b.effectCode));
  }

  private resolvePolicyMetadata(
    actionCode: string,
    base: RuntimeEffectPolicyMetadata | undefined,
    policyPlan: PolicyPlan
  ): RuntimeEffectPolicyMetadata {
    const metadata: RuntimeEffectPolicyMetadata = {
      retryPolicy: base?.retryPolicy,
      timeoutSeconds: base?.timeoutSeconds,
      compensationActionCode: base?.compensationActionCode,
      rollbackOnFailure: base?.rollbackOnFailure,
    };

    const applicable = policyPlan.policies.filter((policy) => {
      if (policy.scope === "Workflow" || policy.scope === "Transition") {
        return true;
      }
      return policy.scope === "Action" && policy.actionCode === actionCode;
    });

    for (const policy of applicable) {
      if (policy.policyType === "RetryPolicy") {
        const maxAttempts = toNumber(policy.configuration.maxAttempts);
        const backoffSeconds = toNumber(policy.configuration.backoffSeconds);
        if (maxAttempts !== undefined && backoffSeconds !== undefined) {
          metadata.retryPolicy = { maxAttempts, backoffSeconds };
        }
      }

      if (policy.policyType === "TimeoutPolicy") {
        const timeoutSeconds = toNumber(policy.configuration.timeoutSeconds);
        if (timeoutSeconds !== undefined) {
          metadata.timeoutSeconds = timeoutSeconds;
        }
      }

      if (policy.policyType === "CompensationPolicy") {
        if (typeof policy.configuration.compensationActionCode === "string") {
          metadata.compensationActionCode = policy.configuration.compensationActionCode;
        }
      }

      if (policy.policyType === "FailurePolicy") {
        if (typeof policy.configuration.rollbackOnFailure === "boolean") {
          metadata.rollbackOnFailure = policy.configuration.rollbackOnFailure;
        }
      }
    }

    return metadata;
  }

  private topologicalOrder(graph: EffectGraph): { ordered: string[]; batches: string[][] } {
    const incoming = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const node of graph.nodes) {
      incoming.set(node, 0);
      adjacency.set(node, []);
    }

    for (const edge of graph.edges) {
      if (!incoming.has(edge.from)) {
        incoming.set(edge.from, 0);
        adjacency.set(edge.from, []);
      }
      if (!incoming.has(edge.to)) {
        incoming.set(edge.to, 0);
        adjacency.set(edge.to, []);
      }
      adjacency.get(edge.from)?.push(edge.to);
      incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    }

    const ordered: string[] = [];
    const batches: string[][] = [];
    let ready = [...incoming.entries()]
      .filter(([, degree]) => degree === 0)
      .map(([node]) => node)
      .sort((a, b) => a.localeCompare(b));

    while (ready.length > 0) {
      const batch = [...ready];
      batches.push(batch);
      ready = [];

      for (const node of batch) {
        ordered.push(node);
        for (const next of adjacency.get(node) ?? []) {
          const degree = (incoming.get(next) ?? 0) - 1;
          incoming.set(next, degree);
          if (degree === 0) {
            ready.push(next);
          }
        }
      }

      ready.sort((a, b) => a.localeCompare(b));
    }

    if (ordered.length !== incoming.size) {
      const cyclicNodes = [...incoming.entries()]
        .filter(([, degree]) => degree > 0)
        .map(([node]) => node)
        .sort((a, b) => a.localeCompare(b));
      throw new Error(`Circular runtime effect dependencies detected: ${cyclicNodes.join(", ")}`);
    }

    return { ordered, batches };
  }
}
