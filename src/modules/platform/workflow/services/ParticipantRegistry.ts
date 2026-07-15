import type { IParticipantProvider } from "../contracts/IParticipantProvider";
import type { IParticipantRegistry } from "../contracts/IParticipantRegistry";
import type { WorkflowParticipantType } from "../models/WorkflowModels";

export class ParticipantRegistry implements IParticipantRegistry {
  private readonly providers = new Map<WorkflowParticipantType, IParticipantProvider>();

  register(provider: IParticipantProvider): void {
    if (this.providers.has(provider.participantType)) {
      throw new Error(`Duplicate participant provider registered for type ${provider.participantType}.`);
    }
    this.providers.set(provider.participantType, provider);
  }

  get(participantType: WorkflowParticipantType): IParticipantProvider | null {
    return this.providers.get(participantType) ?? null;
  }

  getAll(): readonly IParticipantProvider[] {
    return Object.freeze(Array.from(this.providers.values()));
  }
}
