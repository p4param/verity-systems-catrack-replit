import type { IPlatformActionProvider } from "../../contracts/IWorkflowActionProvider";
import { BaseWorkflowActionProvider } from "./BaseWorkflowActionProvider";

export class PlatformActionProvider extends BaseWorkflowActionProvider implements IPlatformActionProvider {
  constructor() {
    super("action.provider.platform", [
      "StateChange",
      "CreateRecord",
      "UpdateRecord",
      "DeleteRecord",
      "InvokePlatformService",
      "Audit",
      "Log",
      "Wait",
      "Delay",
      "Timer",
      "Expression",
      "Script",
    ]);
  }
}
