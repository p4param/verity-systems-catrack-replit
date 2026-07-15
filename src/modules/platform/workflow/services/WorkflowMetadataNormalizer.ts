import type { WorkflowMetadataSnapshot } from "../models/WorkflowModels";

export interface IWorkflowMetadataNormalizer {
  normalize(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowMetadataSnapshot>;
}

export class WorkflowMetadataNormalizer implements IWorkflowMetadataNormalizer {
  async normalize(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowMetadataSnapshot> {
    return {
      ...snapshot,
      states: [...snapshot.states].sort((a, b) => a.sequence - b.sequence),
      transitions: [...snapshot.transitions].sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.sequence - b.sequence;
      }),
      conditions: [...snapshot.conditions].sort((a, b) => a.sequence - b.sequence),
      rules: [...snapshot.rules].sort((a, b) => a.sequence - b.sequence),
      actions: [...snapshot.actions].sort((a, b) => a.sequence - b.sequence),
      assignments: [...snapshot.assignments].sort((a, b) => a.sequence - b.sequence),
    };
  }
}
