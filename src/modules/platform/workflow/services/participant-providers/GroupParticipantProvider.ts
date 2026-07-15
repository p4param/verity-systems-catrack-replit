import type { IGroupParticipantProvider } from "../../contracts/IParticipantProvider";
import type { AssignmentContext, ResolvedParticipant } from "../../models/WorkflowModels";
import { BaseParticipantProvider } from "./BaseParticipantProvider";

export class GroupParticipantProvider
  extends BaseParticipantProvider
  implements IGroupParticipantProvider
{
  constructor() {
    super("Group", "provider.group");
  }

  async resolve(context: AssignmentContext): Promise<ResolvedParticipant[]> {
    const groups = (context.runtimeContext as any).groups ?? [];
    const targetGroup = context.assignment.targetId?.toUpperCase();

    const filtered = targetGroup
      ? groups.filter((group: string) => group.toUpperCase() === targetGroup)
      : groups;

    return filtered.map((group: string, index: number) => ({
      participantId: group,
      participantType: "Group",
      source: this.providerKey,
      priority: (context.assignment.priority ?? 100) + index,
    }));
  }
}
