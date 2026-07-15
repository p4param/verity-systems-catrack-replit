import type { IDocumentActionProvider } from "../../contracts/IWorkflowActionProvider";
import { BaseWorkflowActionProvider } from "./BaseWorkflowActionProvider";

export class DocumentActionProvider extends BaseWorkflowActionProvider implements IDocumentActionProvider {
  constructor() {
    super("action.provider.document", ["GenerateDocument"]);
  }
}
