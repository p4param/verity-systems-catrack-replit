import type { IUserParticipantProvider } from "../../contracts/IParticipantProvider";
import type { AssignmentContext, ResolvedParticipant } from "../../models/WorkflowModels";
import { BaseParticipantProvider } from "./BaseParticipantProvider";

export class UserParticipantProvider
  extends BaseParticipantProvider
  implements IUserParticipantProvider
{
  constructor() {
    super("User", "provider.user");
  }

  async resolve(context: AssignmentContext): Promise<ResolvedParticipant[]> {
    const participantId = context.assignment.targetId ?? context.runtimeContext.userId;
    if (!participantId) {
      return [];
    }

    return [
      {
        participantId,
        participantType: "User",
        source: this.providerKey,
        priority: context.assignment.priority ?? 100,
      },
    ];
  }
}
