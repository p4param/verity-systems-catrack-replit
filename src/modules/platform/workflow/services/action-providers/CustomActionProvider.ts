import type { ICustomActionProvider } from "../../contracts/IWorkflowActionProvider";
import { BaseWorkflowActionProvider } from "./BaseWorkflowActionProvider";

export class CustomActionProvider extends BaseWorkflowActionProvider implements ICustomActionProvider {
  constructor() {
    super("action.provider.custom", ["CustomAction"]);
  }
}
