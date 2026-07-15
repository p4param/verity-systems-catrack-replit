import type { ILookupParticipantProvider } from "../../contracts/IParticipantProvider";
import type { AssignmentContext, ResolvedParticipant } from "../../models/WorkflowModels";
import { BaseParticipantProvider } from "./BaseParticipantProvider";

export class LookupParticipantProvider
  extends BaseParticipantProvider
  implements ILookupParticipantProvider
{
  constructor() {
    super("Lookup", "provider.lookup");
  }

  async resolve(context: AssignmentContext): Promise<ResolvedParticipant[]> {
    const lookupKey = context.assignment.lookupKey ?? context.assignment.targetId;
    if (!lookupKey) {
      return [];
    }

    const value = context.businessObject[lookupKey];
    const values = Array.isArray(value) ? value : value ? [value] : [];

    return values.map((item, index) => ({
      participantId: String(item),
      participantType: "Lookup",
      source: this.providerKey,
      priority: (context.assignment.priority ?? 100) + index,
    }));
  }
}
