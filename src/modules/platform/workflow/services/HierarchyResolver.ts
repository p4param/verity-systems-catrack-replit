import type { IHierarchyResolver } from "../contracts/IHierarchyResolver";
import type { AssignmentContext, ResolvedParticipant } from "../models/WorkflowModels";

export class HierarchyResolver implements IHierarchyResolver {
  async resolveHierarchy(context: AssignmentContext): Promise<ResolvedParticipant[]> {
    const chain = ((context.runtimeContext as any).hierarchyChain ?? []) as string[];

    return chain.map((id, index) => ({
      participantId: id,
      participantType: "OrganizationHierarchy",
      source: "resolver.hierarchy",
      priority: (context.assignment.priority ?? 100) + index,
    }));
  }

  async hasCircularHierarchy(context: AssignmentContext): Promise<boolean> {
    const chain = ((context.runtimeContext as any).hierarchyChain ?? []) as string[];
    const seen = new Set<string>();

    for (const id of chain) {
      const key = id.toUpperCase();
      if (seen.has(key)) {
        return true;
      }
      seen.add(key);
    }

    return false;
  }
}
