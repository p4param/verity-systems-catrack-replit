import type { IReportActionProvider } from "../../contracts/IWorkflowActionProvider";
import { BaseWorkflowActionProvider } from "./BaseWorkflowActionProvider";

export class ReportActionProvider extends BaseWorkflowActionProvider implements IReportActionProvider {
  constructor() {
    super("action.provider.report", ["GenerateReport"]);
  }
}
