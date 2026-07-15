import type { IHierarchyParticipantProvider } from "../../contracts/IParticipantProvider";
import type { IHierarchyResolver } from "../../contracts/IHierarchyResolver";
import type { AssignmentContext, ResolvedParticipant } from "../../models/WorkflowModels";
import { BaseParticipantProvider } from "./BaseParticipantProvider";

export class HierarchyParticipantProvider
  extends BaseParticipantProvider
  implements IHierarchyParticipantProvider
{
  override readonly capabilities = {
    supportsEligibility: true,
    supportsHierarchy: true,
    supportsDelegation: true,
    deterministic: true,
  } as const;

  constructor(private readonly hierarchyResolver: IHierarchyResolver) {
    super("OrganizationHierarchy", "provider.hierarchy");
  }

  async resolve(context: AssignmentContext): Promise<ResolvedParticipant[]> {
    return this.hierarchyResolver.resolveHierarchy(context);
  }
}
