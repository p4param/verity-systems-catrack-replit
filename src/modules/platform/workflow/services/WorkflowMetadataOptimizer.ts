import type { WorkflowMetadataSnapshot } from "../models/WorkflowModels";

export interface IWorkflowMetadataOptimizer {
  optimize(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowMetadataSnapshot>;
}

export class WorkflowMetadataOptimizer implements IWorkflowMetadataOptimizer {
  async optimize(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowMetadataSnapshot> {
    const dedupedTransitions = new Map<string, (typeof snapshot.transitions)[number]>();
    for (const transition of snapshot.transitions) {
      const key = `${transition.sourceStateCode}->${transition.destinationStateCode}:${transition.actionCode}`;
      if (!dedupedTransitions.has(key)) {
        dedupedTransitions.set(key, transition);
      }
    }

    return {
      ...snapshot,
      transitions: Array.from(dedupedTransitions.values()),
    };
  }
}
