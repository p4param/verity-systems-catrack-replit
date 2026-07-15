import type { IWorkflowMetadataProvider } from "../contracts/IWorkflowMetadataProvider";
import type { IWorkflowMiddleware } from "../contracts/IWorkflowMiddleware";
import type { RuntimeMiddlewareState } from "@/modules/platform/runtime/application";

export class WorkflowMiddleware implements IWorkflowMiddleware {
  constructor(
    private readonly metadataProvider: IWorkflowMetadataProvider
  ) {}

  async execute(state: RuntimeMiddlewareState, next: () => Promise<void>): Promise<void> {
    const manifest = state.context.entityDefinition as any;
    const workflowEnabled =
      Boolean(manifest?.workflow?.enabled) ||
      Boolean(manifest?.workflowEnabled) ||
      Boolean(manifest?.presentation?.shared?.workflowEnabled);

    if (!workflowEnabled) {
      await next();
      return;
    }

    const workflowManifest = await this.metadataProvider.getManifestForEntity(
      state.context.entityId,
      state.context.tenantId
    );

    if (!workflowManifest) {
      state.warnings.push("Workflow enabled entity has no published workflow manifest.");
      await next();
      return;
    }

    if (!workflowManifest.validation.isValid) {
      const errors = workflowManifest.validation.errors.map((item) => item.message).join("; ");
      throw new Error(`Workflow: invalid workflow manifest. ${errors}`);
    }

    const initialState = workflowManifest.runtimeModel.graph.nodes.find((item) => item.isInitial);

    state.context = state.context.with({
      workflowDefinitionId: workflowManifest.workflowDefinitionId,
      workflowVersionId: workflowManifest.workflowVersionId,
      workflowState: initialState?.code ?? state.context.workflowState,
      workflowInstanceId: state.context.workflowInstanceId,
      workflowVariables: state.context.workflowVariables,
      workflowAssignments: workflowManifest.runtimeModel.assignments,
      workflowManifest,
    });

    await next();
  }
}
