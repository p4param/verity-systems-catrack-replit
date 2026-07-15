import type { IRoleParticipantProvider } from "../../contracts/IParticipantProvider";
import type { AssignmentContext, ResolvedParticipant } from "../../models/WorkflowModels";
import { BaseParticipantProvider } from "./BaseParticipantProvider";

export class RoleParticipantProvider
  extends BaseParticipantProvider
  implements IRoleParticipantProvider
{
  constructor() {
    super("Role", "provider.role");
  }

  async resolve(context: AssignmentContext): Promise<ResolvedParticipant[]> {
    const roles = context.runtimeContext.roles ?? [];
    const targetRole = context.assignment.targetId?.toUpperCase();

    const filtered = targetRole
      ? roles.filter((role) => role.toUpperCase() === targetRole)
      : roles;

    return filtered.map((role, index) => ({
      participantId: role,
      participantType: "Role",
      source: this.providerKey,
      priority: (context.assignment.priority ?? 100) + index,
    }));
  }
}
