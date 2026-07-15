import type { ICustomParticipantProvider } from "../../contracts/IParticipantProvider";
import type { AssignmentContext, ResolvedParticipant, WorkflowParticipantType } from "../../models/WorkflowModels";
import { BaseParticipantProvider } from "./BaseParticipantProvider";

export class CustomParticipantProvider
  extends BaseParticipantProvider
  implements ICustomParticipantProvider
{
  constructor(participantType: WorkflowParticipantType, providerKey: string) {
    super(participantType, providerKey);
  }

  async resolve(_context: AssignmentContext): Promise<ResolvedParticipant[]> {
    return [];
  }
}
