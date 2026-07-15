import { randomUUID } from "crypto";
import { StateMachineEngine } from "../services/StateMachineEngine";
import type { IStateMachineEngine } from "../contracts/IStateMachineEngine";
import type { IWorkflowManifestGenerator } from "../contracts/IWorkflowManifestGenerator";
import type {
  WorkflowManifest,
  WorkflowMetadataSnapshot,
  WorkflowValidationResult,
} from "../models/WorkflowModels";

export class WorkflowManifestGenerator implements IWorkflowManifestGenerator {
  constructor(private readonly stateMachineEngine: IStateMachineEngine = new StateMachineEngine()) {}

  async generate(
    snapshot: WorkflowMetadataSnapshot,
    validation: WorkflowValidationResult,
    actorUserId: string
  ): Promise<WorkflowManifest> {
    const runtimeModel = await this.stateMachineEngine.buildRuntimeModel(snapshot);

    return {
      id: randomUUID(),
      workflowDefinitionId: snapshot.definition.id,
      workflowVersionId: snapshot.version.id,
      generatedAt: new Date(),
      generatedBy: actorUserId,
      runtimeModel,
      validation,
      designerSnapshot: snapshot,
    };
  }
}
