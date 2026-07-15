import type { IApiActionProvider } from "../../contracts/IWorkflowActionProvider";
import { BaseWorkflowActionProvider } from "./BaseWorkflowActionProvider";

export class ApiActionProvider extends BaseWorkflowActionProvider implements IApiActionProvider {
  constructor() {
    super("action.provider.api", ["CallAPI"]);
  }
}
