import type { IEventActionProvider } from "../../contracts/IWorkflowActionProvider";
import { BaseWorkflowActionProvider } from "./BaseWorkflowActionProvider";

export class EventActionProvider extends BaseWorkflowActionProvider implements IEventActionProvider {
  constructor() {
    super("action.provider.event", ["RaiseEvent"]);
  }
}
