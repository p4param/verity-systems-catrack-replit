import type { INotificationActionProvider } from "../../contracts/IWorkflowActionProvider";
import { BaseWorkflowActionProvider } from "./BaseWorkflowActionProvider";

export class NotificationActionProvider
  extends BaseWorkflowActionProvider
  implements INotificationActionProvider
{
  constructor() {
    super("action.provider.notification", ["Notification"]);
  }
}
