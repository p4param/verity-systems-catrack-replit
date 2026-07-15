import { randomUUID } from "crypto";
import { WorkflowActionRegistry } from "../services/WorkflowActionRegistry";
import {
  ApiActionProvider,
  CustomActionProvider,
  DocumentActionProvider,
  EventActionProvider,
  NotificationActionProvider,
  PlatformActionProvider,
  ReportActionProvider,
} from "../services/action-providers";

function buildRegistry(): WorkflowActionRegistry {
  const registry = new WorkflowActionRegistry();
  registry.register(new PlatformActionProvider());
  registry.register(new ApiActionProvider());
  registry.register(new DocumentActionProvider());
  registry.register(new ReportActionProvider());
  registry.register(new EventActionProvider());
  registry.register(new NotificationActionProvider());
  registry.register(new CustomActionProvider());
  return registry;
}

describe("Workflow action providers and registry", () => {
  test("resolves provider by action type and provider key", () => {
    const registry = buildRegistry();

    const apiProvider = registry.getByActionType("CallAPI");
    const customProvider = registry.getByProviderKey("action.provider.custom");

    expect(apiProvider?.providerKey).toBe("action.provider.api");
    expect(customProvider?.actionTypes.includes("CustomAction")).toBe(true);
  });

  test("registry rejects duplicate action provider registrations", () => {
    const registry = new WorkflowActionRegistry();
    registry.register(new PlatformActionProvider());

    expect(() => registry.register(new PlatformActionProvider())).toThrow("Duplicate action provider registered");
  });

  test("providers return deterministic action planning metadata", async () => {
    const registry = buildRegistry();
    const provider = registry.getByActionType("Notification");

    expect(provider).not.toBeNull();

    const action = await provider!.resolveAction(
      {
        snapshot: {
          definition: {} as any,
          version: { id: randomUUID() } as any,
          states: [],
          transitions: [],
          conditions: [],
          rules: [],
          actions: [],
          assignments: [],
          approvers: [],
          notifications: [],
          escalations: [],
          slas: [],
          variables: [],
          roles: [],
          groups: [],
          permissions: [],
          expressions: [],
        },
        transition: { code: "SUBMIT" } as any,
        runtimeContext: {} as any,
      },
      {
        id: randomUUID(),
        workflowVersionId: randomUUID(),
        code: "NOTIFY_APPROVER",
        name: "Notify",
        actionType: "Notification",
        sequence: 2,
        isEnabled: true,
        dependsOnActionCodes: ["STATE_CHANGE"],
        priority: 50,
      }
    );

    expect(action.actionCode).toBe("NOTIFY_APPROVER");
    expect(action.dependencies).toEqual(["STATE_CHANGE"]);
    expect(action.providerKey).toBe("action.provider.notification");
  });
});
