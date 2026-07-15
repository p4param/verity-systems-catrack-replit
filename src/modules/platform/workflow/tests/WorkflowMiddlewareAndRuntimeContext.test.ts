import { RuntimeContext } from "@/modules/platform/runtime/application";
import type { RuntimeMiddlewareState } from "@/modules/platform/runtime/application";
import type { IWorkflowMetadataProvider } from "../contracts/IWorkflowMetadataProvider";
import { StateMachineEngine } from "../services/StateMachineEngine";
import { WorkflowMiddleware } from "../runtime/WorkflowMiddleware";
import { RuntimeTransaction } from "@/modules/platform/runtime/application";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

function buildState(): RuntimeMiddlewareState {
  const snapshot = buildWorkflowSnapshot();
  const context = RuntimeContext.create({
    tenantId: snapshot.definition.tenantId,
    organizationId: snapshot.definition.organizationId,
    moduleId: snapshot.definition.moduleId,
    entityId: snapshot.definition.entityId,
    operation: "Save",
    userId: snapshot.definition.createdBy,
    workflowState: {},
    workflowVariables: {},
    workflowAssignments: [],
    entityDefinition: {
      module: "platform",
      entity: "incident",
      entityId: snapshot.definition.entityId,
      entityName: "Incident",
      route: "/runtime/platform/incident",
      permissions: {
        view: "Incident.View",
        create: "Incident.Create",
        edit: "Incident.Edit",
        delete: "Incident.Delete",
      },
      numberStrategy: "AUTO",
      searchEnabled: true,
      fields: [],
      presentation: {
        version: "1",
        defaultDataViewId: "",
        defaultDataViewCode: "",
        defaultLayoutViewId: "",
        defaultLayoutViewCode: "",
        dataViews: [],
        layoutViews: [],
        shared: { workflowEnabled: true },
      },
    } as any,
  });

  return {
    context,
    transaction: RuntimeTransaction.create(),
    diagnostics: {
      pipelineTime: 0,
      metadataTime: 0,
      authorizationTime: 0,
      validationTime: 0,
      businessRulesTime: 0,
      workflowTime: 0,
      persistenceTime: 0,
      notificationTime: 0,
      auditTime: 0,
      totalTime: 0,
      middleware: {},
    },
    warnings: [],
    nonFatalErrors: [],
    flags: { persistenceSucceeded: false },
  };
}

describe("Workflow middleware and runtime context integration", () => {
  test("injects workflow context when workflow manifest exists", async () => {
    const snapshot = buildWorkflowSnapshot();
    const stateMachine = new StateMachineEngine();
    const runtimeModel = await stateMachine.buildRuntimeModel(snapshot);
    const metadataProvider: IWorkflowMetadataProvider = {
      getManifestForEntity: async () => ({
        id: crypto.randomUUID(),
        workflowDefinitionId: snapshot.definition.id,
        workflowVersionId: snapshot.version.id,
        generatedAt: new Date(),
        generatedBy: snapshot.definition.createdBy,
        runtimeModel,
        participantManifest: {
          workflowVersionId: snapshot.version.id,
          generatedAt: new Date(),
          providerMap: {},
          supportedParticipantTypes: [],
        },
        assignmentManifest: {
          workflowVersionId: snapshot.version.id,
          generatedAt: new Date(),
          strategies: [],
        },
        resolutionManifest: {
          workflowVersionId: snapshot.version.id,
          generatedAt: new Date(),
          assignments: [],
        },
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
      }),
    };

    const middleware = new WorkflowMiddleware(metadataProvider);
    const state = buildState();

    await middleware.execute(state, async () => undefined);

    expect(state.context.workflowDefinitionId).toBe(snapshot.definition.id);
    expect(state.context.workflowVersionId).toBe(snapshot.version.id);
    expect(state.context.workflowStateCode).toBe("DRAFT");
    expect(state.context.workflowAssignments.length).toBeGreaterThan(0);
  });

  test("supports new runtime context workflow fields", () => {
    const context = RuntimeContext.create({
      tenantId: crypto.randomUUID(),
      organizationId: crypto.randomUUID(),
      moduleId: "platform",
      entityId: "incident",
      operation: "Load",
      userId: crypto.randomUUID(),
      workflowDefinitionId: crypto.randomUUID(),
      workflowVersionId: crypto.randomUUID(),
      workflowInstanceId: crypto.randomUUID(),
      workflowState: "SUBMITTED",
      workflowVariables: { amount: 1500 },
      workflowAssignments: [{ code: "REVIEWER" }],
      workflowManifest: { id: crypto.randomUUID() },
    });

    expect(context.workflowDefinitionId).toBeDefined();
    expect(context.workflowVersionId).toBeDefined();
    expect(context.workflowInstanceId).toBeDefined();
    expect(context.workflowStateCode).toBe("SUBMITTED");
    expect(context.workflowVariables.amount).toBe(1500);
  });
});
